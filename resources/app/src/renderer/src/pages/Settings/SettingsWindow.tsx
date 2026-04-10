import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Brain,
  History,
  Sliders,
  Command,
  Plug,
  X,
  Plus,
  Trash2,
  Check,
  Upload,
  TestTube,
  FolderOpen,
  Save,
  Sparkles,
  Code,
  FileText,
  ArrowLeftRight,
  SpellCheck2,
} from 'lucide-react';
import './SettingsWindow.css';
import '../../index.css';
import type {
  Skill,
  HistoryItem,
  McpConfig,
  CommandDefinition,
  ModelCustomization,
  AppSettings,
} from '../../../../shared/types';

type Tab = 'models' | 'history' | 'customizations' | 'commands' | 'mcp';

interface LocalSettings extends Partial<AppSettings> {}

export default function SettingsWindow() {
  const [activeTab, setActiveTab] = useState<Tab>('models');
  const [settings, setSettings] = useState<LocalSettings>({});
  const [skills, setSkills] = useState<Skill[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mcpConfigs, setMcpConfigs] = useState<McpConfig[]>([]);
  const [commands, setCommands] = useState<CommandDefinition[]>([]);
  const [modelCustomizations, setModelCustomizations] = useState<Record<string, ModelCustomization>>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Modal states
  const [showSkillUpload, setShowSkillUpload] = useState(false);
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: string; id: string } | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, skillsData, historyData, mcpData, commandsData] = await Promise.all([
        window.api.getSettings(),
        window.api.getSkills(),
        window.api.getHistory(),
        window.api.getMcpConfigs(),
        window.api.getCommands(),
      ]);

      setSettings(settingsData);
      setSkills(skillsData);
      setHistory(historyData);
      setMcpConfigs(mcpData);
      setCommands(commandsData);

      // Load available models
      try {
        const models = await window.api.getOllamaModels();
        setAvailableModels(models.length > 0 ? models : ['mistral', 'llama3.2', 'gemma2', 'qwen2.5']);
      } catch {
        setAvailableModels(['mistral', 'llama3.2', 'gemma2', 'qwen2.5']);
      }
    } catch (error) {
      console.error('Failed to load settings data:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await window.api.setSettings(settings);
      await loadData();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleClose = async () => {
    // Notify main process to shrink window back to pill
    await window.api.hideWindow();
  };

  // Tab configuration
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'models', label: 'Models', icon: <Brain size={18} /> },
    { id: 'history', label: 'History', icon: <History size={18} /> },
    { id: 'customizations', label: 'Customizations', icon: <Sliders size={18} /> },
    { id: 'commands', label: 'Commands', icon: <Command size={18} /> },
    { id: 'mcp', label: 'MCP', icon: <Plug size={18} /> },
  ];

  return (
    <div className="settings-window">
      <div className="settings-header glass-panel">
        <div className="settings-title">
          <Settings size={20} />
          <span>Settings</span>
        </div>
        <button className="close-btn" onClick={handleClose}>
          <X size={20} />
        </button>
      </div>

      <div className="settings-body">
        <nav className="settings-nav glass-panel">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="settings-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="tab-content"
            >
              {activeTab === 'models' && (
                <ModelsTab
                  settings={settings}
                  setSettings={setSettings}
                  availableModels={availableModels}
                  onSave={handleSaveSettings}
                />
              )}
              {activeTab === 'history' && (
                <HistoryTab
                  history={history}
                  settings={settings}
                  setSettings={setSettings}
                  onDelete={(id) => window.api.deleteHistoryItem(id).then(loadData)}
                  onClear={() => window.api.clearHistory().then(loadData)}
                  onSave={handleSaveSettings}
                />
              )}
              {activeTab === 'customizations' && (
                <CustomizationsTab
                  settings={settings}
                  setSettings={setSettings}
                  skills={skills}
                  setSkills={setSkills}
                  modelCustomizations={modelCustomizations}
                  setModelCustomizations={setModelCustomizations}
                  showSkillUpload={showSkillUpload}
                  setShowSkillUpload={setShowSkillUpload}
                  onSave={handleSaveSettings}
                />
              )}
              {activeTab === 'commands' && (
                <CommandsTab
                  commands={commands}
                  setCommands={setCommands}
                  showCommandModal={showCommandModal}
                  setShowCommandModal={setShowCommandModal}
                  editingItem={editingItem}
                  setEditingItem={setEditingItem}
                  onSave={handleSaveSettings}
                />
              )}
              {activeTab === 'mcp' && (
                <McpTab
                  configs={mcpConfigs}
                  setConfigs={setMcpConfigs}
                  showMcpModal={showMcpModal}
                  setShowMcpModal={setShowMcpModal}
                  onSave={handleSaveSettings}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Skill Upload Modal */}
      {showSkillUpload && (
        <SkillUploadModal
          onClose={() => setShowSkillUpload(false)}
          onUpload={async (skill) => {
            await window.api.uploadSkill(skill);
            setShowSkillUpload(false);
            loadData();
          }}
        />
      )}

      {/* MCP Config Modal */}
      {showMcpModal && (
        <McpConfigModal
          config={editingItem ? mcpConfigs.find((c) => c.id === editingItem.id) : undefined}
          onClose={() => {
            setShowMcpModal(false);
            setEditingItem(null);
          }}
          onSave={async (config) => {
            if (editingItem) {
              await window.api.updateMcpConfig(editingItem.id, config);
            } else {
              await window.api.addMcpConfig({
                ...config,
                id: `mcp_${Date.now()}`,
              });
            }
            setShowMcpModal(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}

      {/* Command Modal */}
      {showCommandModal && (
        <CommandModal
          command={editingItem ? commands.find((c) => c.id === editingItem.id) : undefined}
          onClose={() => {
            setShowCommandModal(false);
            setEditingItem(null);
          }}
          onSave={async (command) => {
            if (editingItem) {
              await window.api.updateCommand(editingItem.id, command);
            } else {
              await window.api.addCommand({
                ...command,
                id: `cmd_${Date.now()}`,
              });
            }
            setShowCommandModal(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Models Tab
// ────────────────────────────────────────────────────────────
function ModelsTab({
  settings,
  setSettings,
  availableModels,
  onSave,
}: {
  settings: LocalSettings;
  setSettings: React.Dispatch<React.SetStateAction<LocalSettings>>;
  availableModels: string[];
  onSave: () => void;
}) {
  return (
    <div className="tab-section">
      <h2 className="section-title">Model Selection</h2>

      <div className="form-group">
        <label>Primary Model</label>
        <select
          value={settings.model || 'mistral'}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          className="glass-input"
        >
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.autoPaste ?? true}
            onChange={(e) => setSettings({ ...settings, autoPaste: e.target.checked })}
          />
          <span>Auto-paste results</span>
        </label>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.minimizeToTray ?? true}
            onChange={(e) => setSettings({ ...settings, minimizeToTray: e.target.checked })}
          />
          <span>Minimize to tray on close</span>
        </label>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.launchOnStartup ?? false}
            onChange={(e) => setSettings({ ...settings, launchOnStartup: e.target.checked })}
          />
          <span>Launch on system startup</span>
        </label>
      </div>

      <button className="btn btn-primary" onClick={onSave}>
        <Save size={16} />
        Save Changes
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// History Tab
// ────────────────────────────────────────────────────────────
function HistoryTab({
  history,
  settings,
  setSettings,
  onDelete,
  onClear,
  onSave,
}: {
  history: HistoryItem[];
  settings: LocalSettings;
  setSettings: React.Dispatch<React.SetStateAction<LocalSettings>>;
  onDelete: (id: string) => void;
  onClear: () => void;
  onSave: () => void;
}) {
  return (
    <div className="tab-section">
      <h2 className="section-title">Transcription History</h2>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.historyEnabled ?? true}
            onChange={(e) => setSettings({ ...settings, historyEnabled: e.target.checked })}
          />
          <span>Enable history tracking</span>
        </label>
      </div>

      <div className="form-group">
        <label>Maximum history items</label>
        <input
          type="number"
          min="10"
          max="1000"
          value={settings.historyMaxItems ?? 100}
          onChange={(e) => setSettings({ ...settings, historyMaxItems: parseInt(e.target.value) || 100 })}
          className="glass-input"
        />
      </div>

      <button className="btn btn-danger" onClick={onClear} disabled={history.length === 0}>
        <Trash2 size={16} />
        Clear All History
      </button>

      <div className="history-list">
        {history.length === 0 ? (
          <p className="empty-state">No history entries yet</p>
        ) : (
          history.map((item) => (
            <div key={item.id} className="history-item glass-panel">
              <div className="history-header">
                <span className="history-date">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
                {item.skillName && (
                  <span className="history-skill-badge">{item.skillName}</span>
                )}
                <button className="icon-btn" onClick={() => onDelete(item.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="history-content">
                <div className="history-raw">
                  <strong>Original:</strong>
                  <p>{item.rawText}</p>
                </div>
                <div className="history-refined">
                  <strong>Refined:</strong>
                  <p>{item.refinedText}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="btn btn-primary" onClick={onSave}>
        <Save size={16} />
        Save Changes
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Customizations Tab
// ────────────────────────────────────────────────────────────
function CustomizationsTab({
  settings,
  setSettings,
  skills,
  setSkills,
  modelCustomizations,
  setModelCustomizations,
  showSkillUpload,
  setShowSkillUpload,
  onSave,
}: {
  settings: LocalSettings;
  setSettings: React.Dispatch<React.SetStateAction<LocalSettings>>;
  skills: Skill[];
  setSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
  modelCustomizations: Record<string, ModelCustomization>;
  setModelCustomizations: React.Dispatch<React.SetStateAction<Record<string, ModelCustomization>>>;
  showSkillUpload: boolean;
  setShowSkillUpload: (show: boolean) => void;
  onSave: () => void;
}) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const handleDeleteSkill = async (id: string) => {
    await window.api.deleteSkill(id);
    setSkills(skills.filter((s) => s.id !== id));
  };

  const getSkillIcon = (icon?: string) => {
    switch (icon) {
      case 'file-text':
        return <FileText size={16} />;
      case 'arrow-right-left':
        return <ArrowLeftRight size={16} />;
      case 'spell-check-2':
        return <SpellCheck2 size={16} />;
      default:
        return <Sparkles size={16} />;
    }
  };

  return (
    <div className="tab-section">
      <h2 className="section-title">Model Customizations & Skills</h2>

      {/* System Prompt */}
      <div className="form-group">
        <label>System Prompt</label>
        <textarea
          value={settings.systemPrompt || ''}
          onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
          className="glass-input textarea"
          rows={4}
          placeholder="Enter default system prompt for all models..."
        />
      </div>

      {/* Skills Section */}
      <div className="skills-section">
        <div className="section-header">
          <h3>
            <Sparkles size={18} />
            Skills
          </h3>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowSkillUpload(true)}>
            <Upload size={14} />
            Upload Skill
          </button>
        </div>

        <div className="skills-grid">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className={`skill-card glass-panel ${selectedSkill === skill.id ? 'selected' : ''}`}
              onClick={() => setSelectedSkill(skill.id === selectedSkill ? null : skill.id)}
            >
              <div className="skill-header">
                <div className="skill-icon">{getSkillIcon(skill.icon)}</div>
                <div className="skill-info">
                  <h4>{skill.name}</h4>
                  <p>{skill.description}</p>
                </div>
                {skill.isUser && (
                  <button
                    className="icon-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSkill(skill.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {selectedSkill === skill.id && (
                <div className="skill-template">
                  <strong>Prompt Template:</strong>
                  <pre>{skill.promptTemplate}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={onSave}>
        <Save size={16} />
        Save Changes
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Commands Tab
// ────────────────────────────────────────────────────────────
function CommandsTab({
  commands,
  setCommands,
  showCommandModal,
  setShowCommandModal,
  editingItem,
  setEditingItem,
  onSave,
}: {
  commands: CommandDefinition[];
  setCommands: React.Dispatch<React.SetStateAction<CommandDefinition[]>>;
  showCommandModal: boolean;
  setShowCommandModal: (show: boolean) => void;
  editingItem: { type: string; id: string } | null;
  setEditingItem: (item: { type: string; id: string } | null) => void;
  onSave: () => void;
}) {
  const handleDeleteCommand = async (id: string) => {
    await window.api.deleteCommand(id);
    setCommands(commands.filter((c) => c.id !== id));
  };

  const handleEditCommand = (id: string) => {
    setEditingItem({ type: 'command', id });
    setShowCommandModal(true);
  };

  return (
    <div className="tab-section">
      <div className="section-header">
        <h2 className="section-title">Custom Commands</h2>
        <button className="btn btn-primary" onClick={() => setShowCommandModal(true)}>
          <Plus size={16} />
          Add Command
        </button>
      </div>

      <div className="commands-list">
        {commands.length === 0 ? (
          <p className="empty-state">No custom commands configured</p>
        ) : (
          commands.map((cmd) => (
            <div key={cmd.id} className="command-item glass-panel">
              <div className="command-header">
                <div className="command-info">
                  <code className="command-trigger">{cmd.trigger}</code>
                  <span className={`command-status ${cmd.enabled ? 'enabled' : 'disabled'}`}>
                    {cmd.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="command-actions">
                  <button
                    className="icon-btn"
                    onClick={() => handleEditCommand(cmd.id)}
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={() => handleDeleteCommand(cmd.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="command-description">{cmd.description}</p>
              <p className="command-action">
                <strong>Action:</strong> {cmd.action} → {cmd.payload.substring(0, 50)}
                {cmd.payload.length > 50 ? '...' : ''}
              </p>
            </div>
          ))
        )}
      </div>

      <button className="btn btn-primary" onClick={onSave}>
        <Save size={16} />
        Save Changes
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MCP Tab
// ────────────────────────────────────────────────────────────
function McpTab({
  configs,
  setConfigs,
  showMcpModal,
  setShowMcpModal,
  onSave,
}: {
  configs: McpConfig[];
  setConfigs: React.Dispatch<React.SetStateAction<McpConfig[]>>;
  showMcpModal: boolean;
  setShowMcpModal: (show: boolean) => void;
  onSave: () => void;
}) {
  const handleDeleteConfig = async (id: string) => {
    await window.api.deleteMcpConfig(id);
    setConfigs(configs.filter((c) => c.id !== id));
  };

  const handleTestConnection = async (id: string) => {
    const result = await window.api.testMcpConnection(id);
    alert(result.message);
  };

  const handleEditConfig = (id: string) => {
    setShowMcpModal(true);
    setConfigs((prev) => prev); // Trigger state update for modal
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'obsidian':
        return <FolderOpen size={16} />;
      case 'notion':
        return <FileText size={16} />;
      case 'logseq':
        return <Brain size={16} />;
      default:
        return <Plug size={16} />;
    }
  };

  return (
    <div className="tab-section">
      <div className="section-header">
        <h2 className="section-title">Platform Integrations (MCP)</h2>
        <button className="btn btn-primary" onClick={() => setShowMcpModal(true)}>
          <Plus size={16} />
          Add Integration
        </button>
      </div>

      <div className="mcp-list">
        {configs.length === 0 ? (
          <div className="empty-state">
            <p>No integrations configured</p>
            <p className="hint">Connect MYCRO to Obsidian, Notion, Logseq, or custom platforms</p>
          </div>
        ) : (
          configs.map((config) => (
            <div key={config.id} className="mcp-item glass-panel">
              <div className="mcp-header">
                <div className="mcp-info">
                  <div className="mcp-icon">{getPlatformIcon(config.platform)}</div>
                  <div>
                    <h4>{config.name}</h4>
                    <span className="mcp-platform">{config.platform}</span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={async () => {
                      await window.api.updateMcpConfig(config.id, { enabled: !config.enabled });
                      setConfigs(configs.map((c) => (c.id === config.id ? { ...c, enabled: !c.enabled } : c)));
                    }}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="mcp-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => handleTestConnection(config.id)}>
                  <TestTube size={14} />
                  Test Connection
                </button>
                <button className="btn btn-sm" onClick={() => handleEditConfig(config.id)}>
                  <Settings size={14} />
                  Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteConfig(config.id)}>
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="btn btn-primary" onClick={onSave}>
        <Save size={16} />
        Save Changes
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Skill Upload Modal
// ────────────────────────────────────────────────────────────
function SkillUploadModal({
  onClose,
  onUpload,
}: {
  onClose: () => void;
  onUpload: (skill: Omit<Skill, 'id' | 'isUser'>) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');

  const handleSubmit = () => {
    if (!name || !promptTemplate) {
      alert('Name and Prompt Template are required');
      return;
    }
    onUpload({ name, description, promptTemplate, icon: 'sparkles' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Upload Custom Skill</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Skill Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input"
              placeholder="e.g., Expand Bullets"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input"
              placeholder="Brief description of what this skill does"
            />
          </div>
          <div className="form-group">
            <label>Prompt Template *</label>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className="glass-input textarea"
              rows={6}
              placeholder="Use {{text}} as placeholder for the input text..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <Upload size={16} />
            Upload Skill
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MCP Config Modal
// ────────────────────────────────────────────────────────────
function McpConfigModal({
  config,
  onClose,
  onSave,
}: {
  config?: McpConfig;
  onClose: () => void;
  onSave: (config: Omit<McpConfig, 'id'>) => void;
}) {
  const [name, setName] = useState(config?.name || '');
  const [platform, setPlatform] = useState<McpConfig['platform']>(config?.platform || 'obsidian');
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [vaultPath, setVaultPath] = useState((config?.config as any)?.vaultPath || '');
  const [defaultFolder, setDefaultFolder] = useState((config?.config as any)?.defaultFolder || '');
  const [dateFormat, setDateFormat] = useState((config?.config as any)?.dateFormat || 'YYYY-MM-DD-HHmm');

  const handleSubmit = () => {
    if (!name) {
      alert('Name is required');
      return;
    }

    onSave({
      name,
      platform,
      enabled,
      config: {
        vaultPath,
        defaultFolder,
        dateFormat,
      },
    });
  };

  const handleBrowseVault = async () => {
    // In a real implementation, this would use electron.dialog.showOpenDialog
    alert('Select your Obsidian vault folder (implementation pending)');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{config ? 'Edit' : 'Add'} Integration</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Integration Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input"
              placeholder="e.g., My Obsidian Vault"
            />
          </div>
          <div className="form-group">
            <label>Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as McpConfig['platform'])}
              className="glass-input"
            >
              <option value="obsidian">Obsidian</option>
              <option value="notion">Notion (Coming Soon)</option>
              <option value="logseq">Logseq (Coming Soon)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>Enabled</span>
            </label>
          </div>

          {platform === 'obsidian' && (
            <>
              <div className="form-group">
                <label>Vault Path</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={vaultPath}
                    onChange={(e) => setVaultPath(e.target.value)}
                    className="glass-input"
                    placeholder="C:\Users\...\Obsidian Vault"
                  />
                  <button className="btn btn-sm" onClick={handleBrowseVault}>
                    <FolderOpen size={14} />
                    Browse
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Default Folder (optional)</label>
                <input
                  type="text"
                  value={defaultFolder}
                  onChange={(e) => setDefaultFolder(e.target.value)}
                  className="glass-input"
                  placeholder="e.g., Mycro Notes"
                />
              </div>
              <div className="form-group">
                <label>Date Format</label>
                <input
                  type="text"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="glass-input"
                  placeholder="YYYY-MM-DD-HHmm"
                />
                <small>Use: YYYY, MM, DD, HH, mm</small>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <Save size={16} />
            {config ? 'Save Changes' : 'Add Integration'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Command Modal
// ────────────────────────────────────────────────────────────
function CommandModal({
  command,
  onClose,
  onSave,
}: {
  command?: CommandDefinition;
  onClose: () => void;
  onSave: (command: Omit<CommandDefinition, 'id'>) => void;
}) {
  const [trigger, setTrigger] = useState(command?.trigger || '');
  const [description, setDescription] = useState(command?.description || '');
  const [action, setAction] = useState<CommandDefinition['action']>(command?.action || 'paste');
  const [payload, setPayload] = useState(command?.payload || '');
  const [enabled, setEnabled] = useState(command?.enabled ?? true);

  const handleSubmit = () => {
    if (!trigger || !payload) {
      alert('Trigger and Payload are required');
      return;
    }

    onSave({
      trigger,
      description,
      action,
      payload,
      enabled,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{command ? 'Edit' : 'Add'} Command</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Trigger Phrase *</label>
            <input
              type="text"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="glass-input"
              placeholder="e.g., insert signature"
            />
            <small>The command activates when this phrase is detected</small>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input"
              placeholder="Brief description of what this command does"
            />
          </div>
          <div className="form-group">
            <label>Action Type</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as CommandDefinition['action'])}
              className="glass-input"
            >
              <option value="paste">Paste Text</option>
              <option value="open_url">Open URL</option>
              <option value="run_macro">Run Macro</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label>Payload *</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="glass-input textarea"
              rows={4}
              placeholder={action === 'open_url' ? 'https://example.com' : 'Text to paste or macro content...'}
            />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>Enabled</span>
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <Save size={16} />
            {command ? 'Save Changes' : 'Add Command'}
          </button>
        </div>
      </div>
    </div>
  );
}
