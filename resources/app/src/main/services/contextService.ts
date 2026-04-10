import { spawn } from 'child_process';
import logger from '../logger';

export interface ContextCaptureResult {
  text: string;
  success: boolean;
}

class ContextCaptureService {
  async captureSelectedText(): Promise<ContextCaptureResult> {
    logger.info('Capturing context from active window...');

    return new Promise((resolve) => {
      // PowerShell script to:
      // 1. Save current clipboard to memory
      // 2. Send Ctrl+C
      // 3. Wait briefly for clipboard to populate
      // 4. Read new clipboard text
      // 5. Restore old clipboard text
      // 6. Return the captured text
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        
        $originalText = ""
        try { $originalText = [System.Windows.Forms.Clipboard]::GetText() } catch { }
        
        [System.Windows.Forms.SendKeys]::SendWait("^{c}")
        Start-Sleep -Milliseconds 150
        
        $newText = ""
        try { $newText = [System.Windows.Forms.Clipboard]::GetText() } catch { }
        
        try { 
            if ($originalText) {
                [System.Windows.Forms.Clipboard]::SetText($originalText) 
            } else {
                [System.Windows.Forms.Clipboard]::Clear()
            }
        } catch { }

        # Output the captured text as JSON structure to avoid escaping issues
        $result = @{ text = $newText }
        $result | ConvertTo-Json -Compress
      `;

      const proc = spawn('powershell', [
        '-ExecutionPolicy', 'Bypass',
        '-NoProfile',
        '-WindowStyle', 'Hidden',
        '-Command', psScript
      ]);

      let stdout = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && stdout.trim() !== '') {
          try {
            const parsed = JSON.parse(stdout.trim());
            logger.info(`Context captured: ${parsed.text.length} characters`);
            resolve({ text: parsed.text, success: true });
          } catch (e) {
            resolve({ text: '', success: false });
          }
        } else {
          resolve({ text: '', success: false });
        }
      });

      proc.on('error', () => {
        resolve({ text: '', success: false });
      });
    });
  }
}

export const contextCaptureService = new ContextCaptureService();
export default contextCaptureService;
