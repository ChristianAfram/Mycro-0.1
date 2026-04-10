import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import logger from '../logger';

interface RecordingSession {
  path: string;
  startTime: number;
  duration: number;
  sampleRate: number;
}

/**
 * AudioRecorder — captures microphone audio on Windows using PowerShell + .NET winmm.dll.
 * Uses multiple rolling buffers to support recordings of any length.
 * Produces 16kHz 16-bit mono WAV files suitable for Whisper.
 */
class AudioRecorder {
  private isRecording: boolean = false;
  private currentProcess: ChildProcess | null = null;
  private currentSession: RecordingSession | null = null;
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(app.getPath('userData'), 'recordings');
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async startRecording(): Promise<string | null> {
    if (this.isRecording) {
      logger.warn('Already recording');
      return this.currentSession?.path || null;
    }

    const timestamp = Date.now();
    const outputPath = path.join(this.tempDir, `recording_${timestamp}.wav`);

    try {
      // PowerShell C# inline: multi-buffer winmm recorder supporting unlimited duration
      const psScript = `
Add-Type @"
using System;
using System.IO;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

public class MicRecorder {
    const int BUFFER_SECONDS = 4;
    const int NUM_BUFFERS = 4;
    const int SAMPLE_RATE = 16000;
    const int BITS = 16;
    const int CHANNELS = 1;

    [DllImport("winmm.dll")] static extern int waveInOpen(out IntPtr phwi, int uDeviceID, ref WAVEFORMATEX lpFormat, IntPtr dwCallback, IntPtr dwInstance, int fdwOpen);
    [DllImport("winmm.dll")] static extern int waveInPrepareHeader(IntPtr hwi, IntPtr lpWaveHdr, int uSize);
    [DllImport("winmm.dll")] static extern int waveInUnprepareHeader(IntPtr hwi, IntPtr lpWaveHdr, int uSize);
    [DllImport("winmm.dll")] static extern int waveInAddBuffer(IntPtr hwi, IntPtr lpWaveHdr, int uSize);
    [DllImport("winmm.dll")] static extern int waveInStart(IntPtr hwi);
    [DllImport("winmm.dll")] static extern int waveInStop(IntPtr hwi);
    [DllImport("winmm.dll")] static extern int waveInReset(IntPtr hwi);
    [DllImport("winmm.dll")] static extern int waveInClose(IntPtr hwi);

    [StructLayout(LayoutKind.Sequential)]
    public struct WAVEFORMATEX {
        public ushort wFormatTag;
        public ushort nChannels;
        public uint nSamplesPerSec;
        public uint nAvgBytesPerSec;
        public ushort nBlockAlign;
        public ushort wBitsPerSample;
        public ushort cbSize;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct WAVEHDR {
        public IntPtr lpData;
        public int dwBufferLength;
        public int dwBytesRecorded;
        public IntPtr dwUser;
        public int dwFlags;
        public int dwLoops;
        public IntPtr lpNext;
        public IntPtr reserved;
    }

    public static void Record(string outputPath) {
        var fmt = new WAVEFORMATEX();
        fmt.wFormatTag = 1;
        fmt.nChannels = CHANNELS;
        fmt.nSamplesPerSec = SAMPLE_RATE;
        fmt.wBitsPerSample = BITS;
        fmt.nBlockAlign = (ushort)(CHANNELS * BITS / 8);
        fmt.nAvgBytesPerSec = (uint)(SAMPLE_RATE * fmt.nBlockAlign);
        fmt.cbSize = 0;

        IntPtr hwi;
        int res = waveInOpen(out hwi, -1, ref fmt, IntPtr.Zero, IntPtr.Zero, 0);
        if (res != 0) { Console.Error.WriteLine("waveInOpen failed: " + res); return; }

        int bufBytes = (int)(fmt.nAvgBytesPerSec * BUFFER_SECONDS);
        int hdrSize = Marshal.SizeOf(typeof(WAVEHDR));
        IntPtr[] hdrPtrs = new IntPtr[NUM_BUFFERS];
        IntPtr[] dataPtrs = new IntPtr[NUM_BUFFERS];

        for (int i = 0; i < NUM_BUFFERS; i++) {
            dataPtrs[i] = Marshal.AllocHGlobal(bufBytes);
            var hdr = new WAVEHDR();
            hdr.lpData = dataPtrs[i];
            hdr.dwBufferLength = bufBytes;
            hdrPtrs[i] = Marshal.AllocHGlobal(hdrSize);
            Marshal.StructureToPtr(hdr, hdrPtrs[i], false);
            waveInPrepareHeader(hwi, hdrPtrs[i], hdrSize);
            waveInAddBuffer(hwi, hdrPtrs[i], hdrSize);
        }

        waveInStart(hwi);
        Console.WriteLine("RECORDING_STARTED");
        Console.Out.Flush();

        var allData = new List<byte>();

        // Poll buffers and collect completed data
        while (Console.In.Peek() == -1) {
            for (int i = 0; i < NUM_BUFFERS; i++) {
                var hdr = (WAVEHDR)Marshal.PtrToStructure(hdrPtrs[i], typeof(WAVEHDR));
                if ((hdr.dwFlags & 1) != 0 && hdr.dwBytesRecorded > 0) { // WHDR_DONE
                    byte[] chunk = new byte[hdr.dwBytesRecorded];
                    Marshal.Copy(hdr.lpData, chunk, 0, hdr.dwBytesRecorded);
                    allData.AddRange(chunk);
                    // Reset and re-add buffer
                    waveInUnprepareHeader(hwi, hdrPtrs[i], hdrSize);
                    var newHdr = new WAVEHDR();
                    newHdr.lpData = dataPtrs[i];
                    newHdr.dwBufferLength = bufBytes;
                    Marshal.StructureToPtr(newHdr, hdrPtrs[i], false);
                    waveInPrepareHeader(hwi, hdrPtrs[i], hdrSize);
                    waveInAddBuffer(hwi, hdrPtrs[i], hdrSize);
                }
            }
            Thread.Sleep(100);
        }
        Console.In.ReadLine();

        waveInStop(hwi);
        waveInReset(hwi);

        // Collect any remaining data from buffers
        for (int i = 0; i < NUM_BUFFERS; i++) {
            var hdr = (WAVEHDR)Marshal.PtrToStructure(hdrPtrs[i], typeof(WAVEHDR));
            if (hdr.dwBytesRecorded > 0) {
                byte[] chunk = new byte[hdr.dwBytesRecorded];
                Marshal.Copy(hdr.lpData, chunk, 0, hdr.dwBytesRecorded);
                allData.AddRange(chunk);
            }
            waveInUnprepareHeader(hwi, hdrPtrs[i], hdrSize);
            Marshal.FreeHGlobal(dataPtrs[i]);
            Marshal.FreeHGlobal(hdrPtrs[i]);
        }

        waveInClose(hwi);

        byte[] audioData = allData.ToArray();
        int dataLen = audioData.Length;

        using (var fs = new FileStream(outputPath, FileMode.Create)) {
            using (var bw = new BinaryWriter(fs)) {
                bw.Write(new char[] {'R','I','F','F'});
                bw.Write(36 + dataLen);
                bw.Write(new char[] {'W','A','V','E'});
                bw.Write(new char[] {'f','m','t',' '});
                bw.Write(16);
                bw.Write((short)1);
                bw.Write((short)CHANNELS);
                bw.Write(SAMPLE_RATE);
                bw.Write(SAMPLE_RATE * CHANNELS * BITS / 8);
                bw.Write((short)(CHANNELS * BITS / 8));
                bw.Write((short)BITS);
                bw.Write(new char[] {'d','a','t','a'});
                bw.Write(dataLen);
                bw.Write(audioData);
            }
        }
        Console.WriteLine("RECORDING_SAVED");
    }
}
"@
[MicRecorder]::Record("${outputPath.replace(/\\/g, '\\\\')}")
`;

      const scriptPath = path.join(this.tempDir, `record_${timestamp}.ps1`);
      fs.writeFileSync(scriptPath, psScript, 'utf-8');

      this.currentProcess = spawn('powershell', [
        '-ExecutionPolicy', 'Bypass',
        '-NoProfile',
        '-File', scriptPath,
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        detached: false,
      });

      this.currentSession = {
        path: outputPath,
        startTime: Date.now(),
        duration: 0,
        sampleRate: 16000,
      };

      this.isRecording = true;

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString().trim();
        logger.debug(`Recorder stdout: ${text}`);
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString().trim();
        if (text) logger.warn(`Recorder stderr: ${text}`);
      });

      this.currentProcess.on('error', (error) => {
        logger.error('Recording process error', error);
        this.handleRecordingError();
      });

      this.currentProcess.on('exit', (code) => {
        logger.debug(`Recording process exited with code ${code}`);
        try { fs.unlinkSync(scriptPath); } catch {}
      });

      logger.info(`Recording started: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Failed to start recording', error);
      this.isRecording = false;
      return null;
    }
  }

  async stopRecording(): Promise<RecordingSession | null> {
    if (!this.isRecording || !this.currentProcess) {
      logger.warn('Not currently recording');
      return null;
    }

    try {
      // Signal stop via stdin
      if (this.currentProcess.stdin && !this.currentProcess.stdin.destroyed) {
        this.currentProcess.stdin.write('\n');
        this.currentProcess.stdin.end();
      }

      // Wait for file to be written
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.currentProcess) {
            this.currentProcess.kill();
          }
          resolve();
        }, 8000);

        if (this.currentProcess) {
          this.currentProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        } else {
          clearTimeout(timeout);
          resolve();
        }
      });

      const duration = (Date.now() - (this.currentSession?.startTime || 0)) / 1000;

      if (this.currentSession) {
        this.currentSession.duration = duration;
      }

      this.isRecording = false;
      this.currentProcess = null;

      logger.info(`Recording stopped: duration=${duration.toFixed(1)}s`);

      // Verify file
      if (this.currentSession && fs.existsSync(this.currentSession.path)) {
        const stats = fs.statSync(this.currentSession.path);
        if (stats.size < 100) {
          logger.warn(`Recording file too small (${stats.size} bytes)`);
          this.currentSession = null;
          return null;
        }
        logger.info(`Recording file size: ${stats.size} bytes`);
      } else {
        logger.error('Recording file was not created');
        this.currentSession = null;
        return null;
      }

      const session = this.currentSession;
      this.currentSession = null;
      return session;
    } catch (error) {
      logger.error('Failed to stop recording', error);
      this.isRecording = false;
      this.currentProcess = null;
      this.currentSession = null;
      return null;
    }
  }

  private handleRecordingError(): void {
    this.isRecording = false;
    if (this.currentProcess) {
      try { this.currentProcess.kill(); } catch {}
    }
    this.currentProcess = null;
    this.currentSession = null;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getCurrentSession(): RecordingSession | null {
    return this.currentSession;
  }

  cleanTempFiles(): void {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          logger.debug(`Cleaned temp file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning temp files', error);
    }
  }
}

export const audioRecorder = new AudioRecorder();
export default audioRecorder;