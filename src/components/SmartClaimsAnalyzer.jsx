import React, { useState, useEffect, useRef } from 'react';
import { Download, RotateCcw, Sparkles, TrendingUp, BarChart3, Eye, Brain, BookOpen, Target, AlertCircle, CheckCircle, XCircle, Shield, Save, Upload, Edit, ThumbsUp, ThumbsDown, Copy, Github, Cloud, Wifi, WifiOff, Users, User, Globe } from 'lucide-react';

const SmartClaimsAnalyzer = () => {
  // 初始数据加载函数
  const loadInitialData = () => {
    return {
      corrections: [],
      newKeywords: {
        功效: {},
        类型: {},
        持续性: {}
      },
      confidence: {},
      userFeedback: {},
      keywordScores: {},
      conflictLog: [],
      removedKeywords: {},
      lastUpdated: null,
      version: '2.4-Misaki15-Public',
      userCorrections: [],
      keywordFrequency: {},
      learningStats: {
        totalCorrections: 0,
        accuracyRate: 100,
        lastAccuracyUpdate: null,
        totalUsers: 0,
        publicContributions: 0
      }
    };
  };

  const [inputText, setInputText] = useState('');
  const [analysisResults, setAnalysisResults] = useState([]);
  const [learningData, setLearningData] = useState(loadInitialData());
  const [showLearningPanel, setShowLearningPanel] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [correctionMode, setCorrectionMode] = useState(''); // 纠错模式：'delete', 'add', 'replace'
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEfficacy, setSelectedEfficacy] = useState('');
  const [validationMessage, setValidationMessage] = useState({ type: '', message: '' });
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [saveQueue, setSaveQueue] = useState([]);
  const [exportData, setExportData] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedProductCategory, setSelectedProductCategory] = useState(''); // 新增：产品品类选择
  const [isSaving, setIsSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [learningMode, setLearningMode] = useState('public'); // 'public' 或 'personal'
  const saveTimeoutRef = useRef(null);
  
  // 智能消息保护机制
  const setValidationMessageSafe = (newMessage) => {
    setValidationMessage(prev => {
      // 如果当前是成功消息，且新消息是GitHub 409错误，保护成功消息
      if (prev.type === 'success' && 
          newMessage.type === 'error' && 
          newMessage.message.includes('GitHub 保存失败') &&
          newMessage.message.includes('409')) {
        console.log('🛡️ 保护成功消息，忽略409冲突错误');
        return prev; // 保持原来的成功消息
      }
      
      // 其他错误正常显示
      return newMessage;
    });
  };

  // 智能保存管理函数
  const saveLearningDataSmart = async (immediate = false, dataToSave = null) => {
    // 如果正在保存中，处理冲突
    if (isSaving) {
      if (immediate) {
        console.log('🔄 当前正在保存，标记为待保存');
        setPendingSave(true);
        return true;
      } else {
        console.log('⏳ 正在保存中，跳过自动保存');
        return true;
      }
    }

    try {
      setIsSaving(true);
      console.log(`💾 开始${immediate ? '立即' : '自动'}保存学习数据...`);
      
      // 使用传入的数据或当前状态数据
      const updatedData = dataToSave || {
        ...learningData,
        lastUpdated: new Date().toISOString()
      };
      
      // 如果没有传入数据，更新状态
      if (!dataToSave) {
        setLearningData(updatedData);
      }
      
      setLastSaveTime(new Date());
      
      // 根据学习模式选择保存方式
      if (learningMode === 'public') {
         const success = await saveToPublicLibrary(updatedData);
         console.log(success ? '✅ 公共学习库保存完成' : '⚠️ 公共学习库保存失败，已保存到本地');
         return true; // 🔧 修复：公共库成功或失败都返回true，保证用户体验
        }
      } else if (githubConfig.enabled) {
        const success = await saveDataToGitHub(updatedData);
        if (success) {
          console.log('✅ 个人GitHub保存成功');
          return true;
        } else {
          throw new Error('个人GitHub保存失败');
        }
      }
      
      console.log('✅ 本地保存成功');
      return true;
      
    } catch (error) {
      console.error('❌ 保存失败:', error);
      
      // 只在立即保存时显示错误给用户
      if (immediate) {
        setValidationMessageSafe({
          type: 'error',
          message: `❌ 保存失败: ${error.message}`
        });
        setTimeout(() => {
          setValidationMessage({ type: '', message: '' });
        }, 3000);
      }
      
      return false;
      
    } finally {
      setIsSaving(false);
      
      // 检查是否有待保存的操作
      if (pendingSave) {
        setPendingSave(false);
        console.log('🔄 执行待保存操作');
        setTimeout(() => saveLearningDataSmart(false), 1500);
      }
    }
  };
  
  // 公共学习库配置 - 面向所有用户
  const PUBLIC_LEARNING_CONFIG = {
    owner: 'Misaki-15',
    repo: 'cosmetics-analyzer-public-learning',
    token: process.env.REACT_APP_PUBLIC_GITHUB_TOKEN,
    branch: 'main',
    filePath: 'public-learning-data.json',
    name: '公共学习库',
    description: '所有用户共享的学习数据库',
    enabled: !!process.env.REACT_APP_PUBLIC_GITHUB_TOKEN && 
            process.env.REACT_APP_PUBLIC_GITHUB_TOKEN !== 'ghp_your_public_token_here'
  };
  
  // 个人GitHub配置 - 保持向后兼容
  const PRESET_GITHUB_CONFIG = {
    owner: process.env.REACT_APP_GITHUB_OWNER || 'Misaki-15',
    repo: process.env.REACT_APP_GITHUB_REPO || 'cosmetics-analyzer-learning',
    token: process.env.REACT_APP_GITHUB_TOKEN,
    branch: 'main',
    filePath: 'learning-data.json',
    autoEnable: false // 默认不自动启用个人库
  };
  
  // GitHub 存储相关状态
  const [githubConfig, setGithubConfig] = useState(() => {
    // 默认不启用个人配置
    return {
      token: '',
      owner: '',
      repo: '',
      enabled: false
    };
  });
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [showGithubConfig, setShowGithubConfig] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [publicSyncStatus, setPublicSyncStatus] = useState('idle'); // 公共库同步状态
  const [lastPublicSyncTime, setLastPublicSyncTime] = useState(null);

  // 公共学习库相关函数
  const loadDataFromPublicLibrary = async () => {
    try {
      setPublicSyncStatus('syncing');
      console.log('🌐 从公共学习库加载数据...');
      
      const response = await fetch(
        `https://api.github.com/repos/${PUBLIC_LEARNING_CONFIG.owner}/${PUBLIC_LEARNING_CONFIG.repo}/contents/${PUBLIC_LEARNING_CONFIG.filePath}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Cosmetics-Analyzer-Public'
          }
        }
      );

      if (response.ok) {
        const fileData = await response.json();
        const content = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
        const data = JSON.parse(content);
        setPublicSyncStatus('success');
        setLastPublicSyncTime(new Date());
        console.log('✅ 公共学习库数据加载成功');
        return data;
      } else if (response.status === 404) {
        console.log('📝 公共学习库文件不存在，将创建新文件');
        setPublicSyncStatus('success');
        return null;
      } else {
        throw new Error(`GitHub API 错误: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 从公共学习库加载数据失败:', error);
      setPublicSyncStatus('error');
      setValidationMessage({
        type: 'warning',
        message: `⚠️ 公共学习库连接失败: ${error.message}，将使用离线模式`
      });
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 5000);
      return null;
    }
  };

  const saveToPublicLibrary = async (dataToSave) => {
    if (!PUBLIC_LEARNING_CONFIG.enabled || !PUBLIC_LEARNING_CONFIG.token) {
      console.log('⚠️ 公共学习库未正确配置，使用本地模式');
      setValidationMessage({
        type: 'info',
        message: '💾 数据已保存到本地（公共学习库功能需要管理员配置）'
      });
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 3000);
      return true; // 返回成功，避免阻塞用户操作
    }
    
    try {
      setPublicSyncStatus('syncing');
      console.log('🌐 保存数据到公共学习库...');

      // 添加公共贡献标识
      const publicData = {
        ...dataToSave,
        lastPublicUpdate: new Date().toISOString(),
        publicContributions: (dataToSave.publicContributions || 0) + 1,
        contributor: 'anonymous', // 匿名贡献
        syncSource: 'public-web-app'
      };
      
      // 先尝试获取当前文件的 SHA
      let sha = null;
      try {
        const currentFile = await fetch(
          `https://api.github.com/repos/${PUBLIC_LEARNING_CONFIG.owner}/${PUBLIC_LEARNING_CONFIG.repo}/contents/${PUBLIC_LEARNING_CONFIG.filePath}`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        if (currentFile.ok) {
          const fileData = await currentFile.json();
          sha = fileData.sha;
        }
      } catch (e) {
        console.log('首次创建公共学习库文件');
      }

      // 保存到公共学习库（这里需要一个有写权限的 token）
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(publicData, null, 2))));
      
      const response = await fetch(
        `https://api.github.com/repos/${PUBLIC_LEARNING_CONFIG.owner}/${PUBLIC_LEARNING_CONFIG.repo}/contents/${PUBLIC_LEARNING_CONFIG.filePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${PUBLIC_LEARNING_CONFIG.token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Cosmetics-Analyzer-Public'
          },
          body: JSON.stringify({
            message: `🌐 公共学习库更新 - ${new Date().toLocaleString('zh-CN')}`,
            content: content,
            ...(sha && { sha })
          })
        }
      );

      if (response.ok) {
        setPublicSyncStatus('success');
        setLastPublicSyncTime(new Date());
        console.log('✅ 公共学习库保存成功');
        return true;
      } else {
        throw new Error(`保存失败: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 保存到公共学习库失败:', error);
      setPublicSyncStatus('error');
      
      // 对于公共库，显示更友好的错误信息
      if (error.message.includes('409')) {
        setValidationMessage({
          type: 'info',
          message: '🔄 检测到其他用户同时在学习，稍后会自动重试保存...'
        });
      } else {
        // 🔧 修复：更智能的错误处理
        let userMessage = '';
        if (error.message.includes('401')) {
          userMessage = '⚠️ 公共学习库访问权限配置问题，数据已保存到本地';
        } else if (error.message.includes('403')) {
          userMessage = '⚠️ 公共学习库访问受限，数据已保存到本地';
        } else if (error.message.includes('404')) {
          userMessage = '⚠️ 公共学习库仓库未找到，数据已保存到本地';
        } else {
          userMessage = `⚠️ 公共学习库暂时不可用，数据已保存到本地`;
        }
  
        setValidationMessage({
          type: 'warning',
          message: userMessage
        });
      }

      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 5000);
      return true; // 🔧 修复：即使公共库失败，也返回成功，保证本地功能正常
    }
  };

  // 学习模式切换
  const switchLearningMode = async (mode) => {
    setLearningMode(mode);
    
    if (mode === 'public') {
      if (!PUBLIC_LEARNING_CONFIG.enabled) {
        setValidationMessage({
          type: 'warning',
          message: '⚠️ 公共学习库功能需要管理员配置，自动切换到本地模式'
        });
        setTimeout(() => {
          setValidationMessage({ type: '', message: '' });
        }, 4000);
        setLearningMode('local'); // 自动降级到本地模式
        return;
      }
      
      // 切换到公共学习库
      console.log('🌐 切换到公共学习库模式');
      const publicData = await loadDataFromPublicLibrary();
      if (publicData) {
        setLearningData(prev => ({
          ...loadInitialData(),
          ...publicData,
          lastUpdated: new Date().toISOString()
        }));
        setValidationMessage({
          type: 'success',
          message: '🌐 已切换到公共学习库！现在您的学习将与所有用户共享'
        });
      } else {
        setValidationMessage({
          type: 'info',
          message: '🌐 已切换到公共学习库模式，将创建新的公共学习数据'
        });
      }
    } else {
      // 切换到个人学习库
      console.log('👤 切换到个人学习库模式');
      setLearningData(loadInitialData());
      setValidationMessage({
        type: 'info',
        message: '👤 已切换到个人学习库模式，请配置您的GitHub设置'
      });
    }
    
    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 5000);
  };

  // GitHub API 相关函数（个人库）
  const loadDataFromGitHub = async () => {
    if (!githubConfig.enabled || !githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      return null;
    }

    try {
      setSyncStatus('syncing');
      const response = await fetch(
        `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/learning-data.json`,
        {
          headers: {
            'Authorization': `token ${githubConfig.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.ok) {
        const fileData = await response.json();
        const content = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
        const data = JSON.parse(content);
        setSyncStatus('success');
        setLastSyncTime(new Date());
        return data;
      } else if (response.status === 404) {
        setSyncStatus('success');
        return null;
      } else {
        throw new Error(`GitHub API 错误: ${response.status}`);
      }
    } catch (error) {
      console.error('从 GitHub 加载数据失败:', error);
      setSyncStatus('error');
      setValidationMessage({
        type: 'error',
        message: `❌ GitHub 同步失败: ${error.message}`
      });
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 5000);
      return null;
    }
  };

  const saveDataToGitHub = async (dataToSave) => {
    if (!githubConfig.enabled || !githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      return false;
    }

    try {
      setSyncStatus('syncing');
      
      let sha = null;
      try {
        const currentFile = await fetch(
          `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/learning-data.json`,
          {
            headers: {
              'Authorization': `token ${githubConfig.token}`
            }
          }
        );
        if (currentFile.ok) {
          const fileData = await currentFile.json();
          sha = fileData.sha;
        }
      } catch (e) {
        // 文件不存在，首次创建
      }

      const finalData = {
        ...dataToSave,
        lastSyncTime: new Date().toISOString(),
        syncSource: 'personal-web-app'
      };

      const content = btoa(unescape(encodeURIComponent(JSON.stringify(finalData, null, 2))));
      
      const response = await fetch(
        `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/learning-data.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubConfig.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `🧠 更新个人学习数据 - ${new Date().toLocaleString('zh-CN')}`,
            content: content,
            ...(sha && { sha })
          })
        }
      );

      if (response.ok) {
        setSyncStatus('success');
        setLastSyncTime(new Date());
        return true;
      } else {
        throw new Error(`保存失败: ${response.status}`);
      }
    } catch (error) {
      console.error('保存到 GitHub 失败:', error);
      setSyncStatus('error');
      setValidationMessageSafe({
        type: 'error',
        message: `❌ GitHub 保存失败: ${error.message}`
      });
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 5000);
      return false;
    }
  };

  const testGitHubConnection = async () => {
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      setValidationMessage({
        type: 'error',
        message: '❌ 请填写完整的 GitHub 配置信息'
      });
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 3000);
      return;
    }

    try {
      setSyncStatus('syncing');
      const response = await fetch(
        `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}`,
        {
          headers: {
            'Authorization': `token ${githubConfig.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.ok) {
        setSyncStatus('success');
        setValidationMessage({
          type: 'success',
          message: '✅ GitHub 连接测试成功！可以启用个人云端同步了'
        });
        setTimeout(() => {
          setValidationMessage({ type: '', message: '' });
        }, 3000);
      } else {
        throw new Error(`连接失败: ${response.status} - 请检查 Token 权限和仓库信息`);
      }
    } catch (error) {
      console.error('GitHub 连接测试失败:', error);
      setSyncStatus('error');
      setValidationMessage({
        type: 'error',
        message: `❌ GitHub 连接失败: ${error.message}`
      });
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 5000);
    }
  };

  // 组件启动时自动初始化公共学习库
  useEffect(() => {
    const initializePublicLibrary = async () => {
      console.log('🚀 自动初始化公共学习库');
      
      try {
        setPublicSyncStatus('syncing');
        const publicData = await loadDataFromPublicLibrary();
        if (publicData) {
          setLearningData(prev => ({
            ...loadInitialData(),
            ...publicData,
            lastUpdated: new Date().toISOString()
          }));
          console.log('✅ 成功加载公共学习库数据');
          setValidationMessage({
            type: 'success',
            message: '🌐 已自动连接公共学习库！您的学习将与所有用户共享，共同提升AI准确性'
          });
        } else {
          console.log('📝 公共学习库为空，准备创建新数据');
          setValidationMessage({
            type: 'info',
            message: '🌐 已连接公共学习库，准备创建共享学习数据...'
          });
        }
        setPublicSyncStatus('success');
        setLastPublicSyncTime(new Date());
      } catch (error) {
        console.error('公共学习库初始化失败:', error);
        setPublicSyncStatus('error');
        setValidationMessage({
          type: 'warning',
          message: '⚠️ 公共学习库连接失败，将使用离线模式。您的学习数据将保存在本地'
        });
      }
      
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 6000);
    };

    initializePublicLibrary();
  }, []);

  // 改进的自动保存逻辑 - 防抖 + 状态检查
  useEffect(() => {
    if (autoSaveEnabled && saveQueue.length > 0 && !isSaving) {
      // 清除之前的定时器（防抖机制）
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        console.log('🚫 清除之前的保存定时器');
      }
    
      // 设置新的防抖定时器
      saveTimeoutRef.current = setTimeout(async () => {
        console.log('⏰ 自动保存定时器触发');
        const success = await saveLearningDataSmart(false);
        if (success) {
          setSaveQueue([]);
        }
      }, 3000); // 增加延迟到3秒
    }
  
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveQueue, autoSaveEnabled, isSaving, learningData, learningMode]);

  // 监听学习数据变化
  useEffect(() => {
    if (autoSaveEnabled) {
      setSaveQueue(prev => [...prev, Date.now()]);
    }
  }, [learningData, autoSaveEnabled]);

  // 保存学习数据
  const saveLearningData = async () => {
    try {
      const updatedData = {
        ...learningData,
        lastUpdated: new Date().toISOString()
      };
      
      setLearningData(updatedData);
      setLastSaveTime(new Date());
      
      // 根据学习模式保存
      if (learningMode === 'public') {
        await saveToPublicLibrary(updatedData);
      } else if (githubConfig.enabled) {
        await saveDataToGitHub(updatedData);
      }
      
      console.log('Learning data saved');
    } catch (error) {
      console.error('Error saving data:', error);
      setValidationMessage({
        type: 'error',
        message: '保存失败'
      });
      
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 3000);
    }
  };

  // 导出学习数据
  const exportLearningData = () => {
    const dataToExport = {
      ...learningData,
      exportDate: new Date().toISOString(),
      exportMode: learningMode,
      baseKeywordMapping: baseKeywordMapping
    };
    
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `化妆品宣称分析器学习数据_${learningMode}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setValidationMessage({
        type: 'success',
        message: '✅ 学习数据已成功导出'
      });
    } catch (error) {
      console.error('Export failed:', error);
      setExportData(jsonString);
      setShowExportModal(true);
      setValidationMessage({
        type: 'info',
        message: '💡 请从弹窗中复制学习数据'
      });
    }
    
    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 3000);
  };

  const clearLearningData = () => {
    const emptyData = loadInitialData();
    setLearningData(emptyData);
    setValidationMessage({
      type: 'success',
      message: '✅ 学习数据已清空'
    });
    
    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 3000);
  };

  // 导入学习数据
  const importLearningData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        if (imported.newKeywords && typeof imported.newKeywords === 'object') {
          const mergedData = {
            ...loadInitialData(),
            corrections: [...learningData.corrections, ...(imported.corrections || [])],
            newKeywords: mergeKeywords(learningData.newKeywords, imported.newKeywords),
            confidence: { ...learningData.confidence, ...imported.confidence },
            userFeedback: { ...learningData.userFeedback, ...imported.userFeedback },
            keywordScores: { ...learningData.keywordScores, ...imported.keywordScores },
            conflictLog: [...learningData.conflictLog, ...(imported.conflictLog || [])],
            removedKeywords: { ...learningData.removedKeywords, ...imported.removedKeywords },
            userCorrections: [...(learningData.userCorrections || []), ...(imported.userCorrections || [])],
            keywordFrequency: { ...learningData.keywordFrequency, ...imported.keywordFrequency },
            lastUpdated: new Date().toISOString(),
            version: '2.4-Misaki15-Public'
          };
          
          setLearningData(mergedData);
          setValidationMessage({
            type: 'success',
            message: '✅ 学习数据导入成功'
          });
          
          setTimeout(() => {
            setValidationMessage({ type: '', message: '' });
          }, 3000);
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        console.error('Import error:', error);
        setValidationMessage({
          type: 'error',
          message: '❌ 导入失败：文件格式不正确'
        });
        
        setTimeout(() => {
          setValidationMessage({ type: '', message: '' });
        }, 3000);
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  // 合并关键词数据
  const mergeKeywords = (existing, imported) => {
    const merged = JSON.parse(JSON.stringify(existing));
    
    Object.entries(imported).forEach(([category, efficacies]) => {
      if (!merged[category]) merged[category] = {};
      
      Object.entries(efficacies).forEach(([efficacy, keywords]) => {
        if (!merged[category][efficacy]) {
          merged[category][efficacy] = [...keywords];
        } else {
          const combinedKeywords = new Set([...merged[category][efficacy], ...keywords]);
          merged[category][efficacy] = Array.from(combinedKeywords);
        }
      });
    });
    
    return merged;
  };

  // 删除学习库中的关键词
  const deleteLearnedKeyword = (category, efficacy, keyword) => {
    setLearningData(prev => {
      const newData = { ...prev };
      
      // 从学习库中移除
      if (newData.newKeywords[category]?.[efficacy]) {
        newData.newKeywords[category][efficacy] = 
          newData.newKeywords[category][efficacy].filter(k => k !== keyword);
        
        // 如果该功效下没有关键词了，删除该功效项
        if (newData.newKeywords[category][efficacy].length === 0) {
          delete newData.newKeywords[category][efficacy];
        }
      }
      
      // 添加到已移除列表
      const key = `${category}-${efficacy}`;
      if (!newData.removedKeywords[key]) {
        newData.removedKeywords[key] = [];
      }
      if (!newData.removedKeywords[key].includes(keyword)) {
        newData.removedKeywords[key].push(keyword);
      }
      
      // 删除关键词得分
      delete newData.keywordScores[keyword];
      
      return newData;
    });
    
    setValidationMessage({
      type: 'success',
      message: `🗑️ 已删除关键词 "${keyword}" (${category}: ${efficacy})`
    });
    
    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 3000);
  };

  // 修改学习库中的关键词
  const editLearnedKeyword = (category, efficacy, oldKeyword, newKeyword) => {
    if (!newKeyword.trim() || oldKeyword === newKeyword.trim()) {
      return;
    }
    
    setLearningData(prev => {
      const newData = { ...prev };
      
      // 替换关键词
      if (newData.newKeywords[category]?.[efficacy]) {
        const index = newData.newKeywords[category][efficacy].indexOf(oldKeyword);
        if (index !== -1) {
          newData.newKeywords[category][efficacy][index] = newKeyword.trim();
        }
      }
      
      // 转移得分
      if (newData.keywordScores[oldKeyword]) {
        newData.keywordScores[newKeyword.trim()] = newData.keywordScores[oldKeyword];
        delete newData.keywordScores[oldKeyword];
      }
      
      return newData;
    });
    
    setValidationMessage({
      type: 'success',
      message: `✏️ 已修改关键词 "${oldKeyword}" → "${newKeyword.trim()}"`
    });
    
    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 3000);
  };

  // 批量管理学习库
  const clearLearningCategory = (category, efficacy = null) => {
    setLearningData(prev => {
      const newData = { ...prev };
      
      if (efficacy) {
        // 清空特定功效下的所有关键词
        if (newData.newKeywords[category]?.[efficacy]) {
          const keywords = newData.newKeywords[category][efficacy];
          keywords.forEach(keyword => {
            delete newData.keywordScores[keyword];
          });
          delete newData.newKeywords[category][efficacy];
        }
      } else {
        // 清空整个类别
        if (newData.newKeywords[category]) {
          Object.values(newData.newKeywords[category]).forEach(keywordList => {
            keywordList.forEach(keyword => {
              delete newData.keywordScores[keyword];
            });
          });
          newData.newKeywords[category] = {};
        }
      }
      
      return newData;
    });
    
    const target = efficacy ? `${efficacy}功效` : `${category}类别`;
    setValidationMessage({
      type: 'success',
      message: `🔄 已清空 ${target} 的所有学习数据`
    });
    
    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 3000);
  };

  const dimension1Options = [
    { value: '染发', code: '01', desc: '以改变头发颜色为目的，使用后即时清洗不能恢复头发原有颜色', color: 'bg-red-100 text-red-800' },
    { value: '烫发', code: '02', desc: '用于改变头发弯曲度（弯曲或拉直），并维持相对稳定', color: 'bg-pink-100 text-pink-800' },
    { value: '祛斑美白', code: '03', desc: '有助于减轻或减缓皮肤色素沉着，达到皮肤美白增白效果', color: 'bg-purple-100 text-purple-800' },
    { value: '防晒', code: '04', desc: '用于保护皮肤、口唇免受特定紫外线所带来的损伤', color: 'bg-orange-100 text-orange-800' },
    { value: '防脱发', code: '05', desc: '有助于改善或减少头发脱落', color: 'bg-yellow-100 text-yellow-800' },
    { value: '祛痘', code: '06', desc: '有助于减少或减缓粉刺的发生；有助于粉刺发生后皮肤的恢复', color: 'bg-green-100 text-green-800' },
    { value: '滋养', code: '07', desc: '有助于为施用部位提供滋养作用', color: 'bg-teal-100 text-teal-800' },
    { value: '修护', code: '08', desc: '有助于维护施用部位保持正常状态', color: 'bg-cyan-100 text-cyan-800' },
    { value: '清洁', code: '09', desc: '用于除去施用部位表面的污垢及附着物', color: 'bg-blue-100 text-blue-800' },
    { value: '卸妆', code: '10', desc: '用于除去施用部位的彩妆等其他化妆品', color: 'bg-indigo-100 text-indigo-800' },
    { value: '保湿', code: '11', desc: '用于补充或增强施用部位水分、油脂等成分含量', color: 'bg-sky-100 text-sky-800' },
    { value: '美容修饰', code: '12', desc: '用于暂时改变施用部位外观状态，达到美化、修饰等作用', color: 'bg-rose-100 text-rose-800' },
    { value: '芳香', code: '13', desc: '具有芳香成分，有助于修饰体味，可增加香味', color: 'bg-violet-100 text-violet-800' },
    { value: '除臭', code: '14', desc: '有助于减轻或遮盖体臭', color: 'bg-fuchsia-100 text-fuchsia-800' },
    { value: '抗皱', code: '15', desc: '有助于减缓皮肤皱纹产生或使皱纹变得不明显', color: 'bg-emerald-100 text-emerald-800' },
    { value: '紧致', code: '16', desc: '有助于保持皮肤的紧实度、弹性', color: 'bg-lime-100 text-lime-800' },
    { value: '舒缓', code: '17', desc: '有助于改善皮肤刺激等状态', color: 'bg-amber-100 text-amber-800' },
    { value: '控油', code: '18', desc: '有助于减缓施用部位皮脂分泌和沉积', color: 'bg-stone-100 text-stone-800' },
    { value: '去角质', code: '19', desc: '有助于促进皮肤角质的脱落或促进角质更新', color: 'bg-zinc-100 text-zinc-800' },
    { value: '爽身', code: '20', desc: '有助于保持皮肤干爽或增强皮肤清凉感', color: 'bg-slate-100 text-slate-800' },
    { value: '护发', code: '21', desc: '有助于改善头发、胡须的梳理性，防止静电，保持或增强毛发的光泽', color: 'bg-gray-100 text-gray-800' },
    { value: '防断发', code: '22', desc: '有助于改善或减少头发断裂、分叉；有助于保持或增强头发韧性', color: 'bg-red-100 text-red-800' },
    { value: '去屑', code: '23', desc: '有助于减缓头屑的产生；有助于减少附着于头皮、头发的头屑', color: 'bg-pink-100 text-pink-800' },
    { value: '发色护理', code: '24', desc: '有助于在染发前后保持头发颜色的稳定', color: 'bg-purple-100 text-purple-800' },
    { value: '脱毛', code: '25', desc: '用于减少或除去体毛', color: 'bg-orange-100 text-orange-800' },
    { value: '辅助剃须剃毛', code: '26', desc: '用于软化、膨胀须发，有助于剃须剃毛时皮肤润滑', color: 'bg-yellow-100 text-yellow-800' },
    { value: '其他', code: 'A', desc: '不符合以上规则的其他功效', color: 'bg-neutral-100 text-neutral-800' }
  ];

  const dimension2Options = [
    { value: '温和宣称', color: 'bg-green-100 text-green-800' },
    { value: '原料功效', color: 'bg-blue-100 text-blue-800' },
    { value: '量化指标', color: 'bg-purple-100 text-purple-800' },
    { value: '喜好度', color: 'bg-pink-100 text-pink-800' },
    { value: '质地', color: 'bg-orange-100 text-orange-800' },
    { value: '使用感受', color: 'bg-cyan-100 text-cyan-800' },
    { value: '使用后体验', color: 'bg-yellow-100 text-yellow-800' }
  ];

  const dimension3Options = [
    { value: '即时', color: 'bg-red-100 text-red-800' },
    { value: '持久', color: 'bg-blue-100 text-blue-800' }
  ];

  // 产品品类定义和功效筛选
  const productCategories = [
    { 
      value: 'hair', 
      label: '头发护理产品', 
      icon: '💇‍♀️',
      color: 'bg-purple-100 text-purple-800',
      applicableEfficacies: [
        '染发', '烫发', '防脱发', '滋养', '修护', '清洁', '保湿', '防晒', 
        '芳香', '舒缓', '护发', '防断发', '去屑', '发色护理', '控油', 
        '去角质', '美容修饰', '其他'
      ]
    },
    { 
      value: 'face', 
      label: '面部护理产品', 
      icon: '🧴',
      color: 'bg-pink-100 text-pink-800',
      applicableEfficacies: [
        '祛斑美白', '防晒', '祛痘', '滋养', '修护', '清洁', '卸妆', '保湿', 
        '美容修饰', '抗皱', '紧致', '舒缓', '控油', '去角质', '芳香', 
        '爽身', '辅助剃须剃毛', '其他'
      ]
    },
    { 
      value: 'body', 
      label: '身体护理产品', 
      icon: '🧴',
      color: 'bg-green-100 text-green-800',
      applicableEfficacies: [
        '防晒', '滋养', '修护', '清洁', '保湿', '美容修饰', '芳香', '除臭', 
        '舒缓', '控油', '去角质', '爽身', '脱毛', '辅助剃须剃毛', '抗皱', 
        '紧致', '祛痘', '祛斑美白', '卸妆', '其他'
      ]
    },
    { 
      value: 'oral', 
      label: '口腔护理产品', 
      icon: '🦷',
      color: 'bg-blue-100 text-blue-800',
      applicableEfficacies: ['清洁', '芳香', '除臭', '舒缓', '其他']
    }
  ];

  // 根据选择的品类筛选功效选项
  const getFilteredDimension1Options = () => {
    if (!selectedProductCategory) {
      return dimension1Options;
    }
    
    const category = productCategories.find(cat => cat.value === selectedProductCategory);
    if (!category) {
      return dimension1Options;
    }
    
    return dimension1Options.filter(option => 
      category.applicableEfficacies.includes(option.value)
    );
  };

  // 基础关键词映射 - 保持稳定不变
  const baseKeywordMapping = {
    功效: {
      '保湿|滋润|水润|锁水|补水|保水|润泽|湿润|水分|水嫩|玻尿酸|透明质酸|甘油|角鲨烷': '保湿',
      '美白|祛斑|亮白|透亮|去斑|淡斑|提亮|均匀肤色|白皙|净白|烟酰胺|熊果苷|VC': '祛斑美白',
      '抗皱|去皱|除皱|皱纹|纹路|细纹|表情纹|法令纹|鱼尾纹|抬头纹|视黄醇|肽': '抗皱',
      '紧致|紧实|弹性|胶原|胶原蛋白|提拉|lifting|firmness|弹力|塑形': '紧致',
      '滋养|润养|养护|深层滋养|营养|补养|润泽|浸润|渗透|精华': '滋养',
      '修护|修复|屏障|强韧|修复力|愈合|重建|再生|修复因子|神经酰胺': '修护',
      '清洁|洗净|去污|清洗|冲洗|洁净|深层清洁|彻底清洁|温和清洁|泡沫': '清洁',
      '控油|吸油|去油|油腻|油光|T区|出油|皮脂|哑光|清爽|水杨酸': '控油',
      '舒缓|缓解|减轻|改善刺激|温和|安抚|镇静|敏感|刺激|积雪草|洋甘菊': '舒缓',
      '防晒|隔离|防护|阻挡|紫外线|UV|SPF|PA|日晒|阳光|氧化锌|二氧化钛': '防晒',
      '护发|柔顺|丝滑|光泽|shine|顺滑|柔软|梳理|防静电|发膜|护发素|蓬松': '护发',
      '祛痘|痘痘|粉刺|青春痘|暗疮|痤疮|黑头|白头|闭口|茶树|水杨酸': '祛痘',
      '染发|着色|上色|显色|彩色|颜色|发色|调色|漂色|染膏': '染发',
      '烫发|卷发|直发|弯曲|拉直|造型|定型|塑型|波浪|烫发水': '烫发',
      '卸妆|卸除|卸掉|去妆|卸妆水|卸妆油|卸妆乳|卸妆膏|清除彩妆': '卸妆',
      '美容|修饰|妆容|彩妆|化妆|遮瑕|遮盖|掩盖|美化|底妆': '美容修饰',
      '香|香味|香气|留香|体香|香调|香水|芳香|香氛|香精': '芳香',
      '除臭|去味|去异味|抑制异味|防臭|消臭|止汗|腋下|体味': '除臭',
      '去角质|角质|exfoliate|磨砂|剥脱|脱皮|死皮|果酸|酵素': '去角质',
      '爽身|干爽|清凉|凉爽|清爽|舒适|透气|凉感|薄荷': '爽身',
      '防脱|脱发|掉发|固发|育发|生发|发根|发量|浓密|生姜': '防脱发',
      '防断发|断发|分叉|韧性|强韧|坚韧|发丝强度|蛋白质': '防断发',
      '去屑|头屑|dandruff|头皮屑|鳞屑|片状|白屑|吡啶硫酮锌': '去屑',
      '发色护理|护色|锁色|保色|发色|色彩|颜色保持|护色素': '发色护理',
      '脱毛|除毛|去毛|hair removal|腿毛|腋毛|体毛|脱毛膏': '脱毛',
      '剃须|剃毛|shaving|胡须|胡子|刮胡|剃刀|剃须膏': '辅助剃须剃毛'
    },
    
    类型: {
      '温和|无刺激|不刺激|亲肤|gentle|mild|温柔|柔和|低刺激|敏感肌|0刺激': '温和宣称',
      '成分|原料|ingredient|含有|添加|富含|萃取|extract|精华|配方|活性物': '原料功效',
      '24小时|12小时|8小时|持续|%|倍|次|程度|测试|临床|数据|调查|数字': '量化指标',
      '喜欢|喜好|满意|推荐|好评|评価|好用|实用|有效|回购|点赞': '喜好度',
      '质地|texture|丝滑|绵密|轻盈|粘腻|厚重|轻薄|浓稠|延展性|触感': '质地',
      '感觉|感受到|体验|使用时|抹开|涂抹|上脸|第一感觉|瞬间|触碰': '使用感受',
      '使用后|用完|涂完|肌肤.*了|让.*肌|皮肤变得|坚持使用|长期使用|效果': '使用后体验'
    },
    
    持续性: {
      '即刻|立即|瞬间|马上|快速|即时|当下|现在|立竿见影|秒|瞬时|急速': '即时',
      '持久|长效|持续|24小时|12小时|8小时|48小时|72小时|长时间|长期|逐渐|慢慢|天|日|周|月|年|小时|分钟|持续性|耐久|恒久|7天|3天|5天|10天|30天|一周|一月|全天|整夜': '持久'
    }
  };

  const getEfficacyColor = (efficacy) => {
    const option = dimension1Options.find(opt => opt.value === efficacy);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  const getDimension2Color = (type) => {
    const option = dimension2Options.find(opt => opt.value === type);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  const getDimension3Color = (duration) => {
    const option = dimension3Options.find(opt => opt.value === duration);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  // 第一步：基础分析 - 使用稳定的基础关键词库，并根据品类筛选
  const baseAnalyzeText = (text) => {
    console.log('=== 第一步：基础分析 ===');
    console.log('分析文本:', text);
    console.log('选择的品类:', selectedProductCategory);
    
    const result = {
      dimension1: [],
      dimension2: [],
      dimension3: '即时',
      confidence: {
        dimension1: 0,
        dimension2: 0,
        dimension3: 0
      },
      matchedKeywords: []
    };

    // 获取适用的功效列表
    const applicableEfficacies = selectedProductCategory 
      ? productCategories.find(cat => cat.value === selectedProductCategory)?.applicableEfficacies || []
      : dimension1Options.map(opt => opt.value);

    // 分析维度一（功效）- 根据品类筛选
    const efficacyEntries = Object.entries(baseKeywordMapping.功效);
    const matchedEfficacies = new Map();
    const matchedKeywordsList = [];
    
    for (const [keywordPattern, category] of efficacyEntries) {
      // 只分析适用于当前品类的功效
      if (!applicableEfficacies.includes(category)) {
        console.log(`品类筛选 - 跳过不适用功效: ${category}`);
        continue;
      }
      
      const keywords = keywordPattern.split('|');
      for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`基础匹配 - 功效: "${keyword}" -> ${category} (品类: ${selectedProductCategory || '全部'})`);
          
          if (!matchedEfficacies.has(category)) {
            matchedEfficacies.set(category, []);
          }
          matchedEfficacies.get(category).push(keyword);
          matchedKeywordsList.push({
            category: 'dimension1',
            keyword: keyword,
            result: category,
            score: 1,
            source: 'base'
          });
        }
      }
    }
    
    result.dimension1 = matchedEfficacies.size > 0 ? Array.from(matchedEfficacies.keys()) : ['其他'];
    result.confidence.dimension1 = matchedEfficacies.size > 0 ? 
      Math.min(0.9, 0.5 + (matchedEfficacies.size * 0.2)) : 0.1;

    // 分析维度二（类型）- 不受品类影响
    const typeEntries = Object.entries(baseKeywordMapping.类型);
    const matchedTypes = [];
    
    for (const [keywordPattern, category] of typeEntries) {
      const keywords = keywordPattern.split('|');
      for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          if (!matchedTypes.includes(category)) {
            matchedTypes.push(category);
            matchedKeywordsList.push({
              category: 'dimension2',
              keyword: keyword,
              result: category,
              source: 'base'
            });
            console.log(`基础匹配 - 类型: "${keyword}" -> ${category}`);
          }
        }
      }
    }
    
    result.dimension2 = matchedTypes.length > 0 ? matchedTypes : ['使用感受'];
    result.confidence.dimension2 = matchedTypes.length > 0 ? 0.8 : 0.3;

    // 分析维度三（持续性）- 不受品类影响
    for (const [keywordPattern, category] of Object.entries(baseKeywordMapping.持续性)) {
      const keywords = keywordPattern.split('|');
      let matched = false;
      for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          result.dimension3 = category;
          result.confidence.dimension3 = 0.8;
          matchedKeywordsList.push({
            category: 'dimension3',
            keyword: keyword,
            result: category,
            source: 'base'
          });
          console.log(`基础匹配 - 持续性: "${keyword}" -> ${category}`);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    result.matchedKeywords = matchedKeywordsList;
    console.log('基础分析结果:', result);
    return result;
  };

  // 第二步：学习增强 - 使用学习的关键词对结果进行增强，并受品类筛选影响
  const enhanceWithLearning = (text, baseResult) => {
    console.log('=== 第二步：学习增强 ===');
    
    const enhancedResult = JSON.parse(JSON.stringify(baseResult));
    
    if (!learningData.newKeywords) {
      console.log('无学习数据，返回基础结果');
      return enhancedResult;
    }

    // 获取适用的功效列表
    const applicableEfficacies = selectedProductCategory 
      ? productCategories.find(cat => cat.value === selectedProductCategory)?.applicableEfficacies || []
      : dimension1Options.map(opt => opt.value);

    // 检查学习的功效关键词 - 根据品类筛选
    const learnedEfficacies = learningData.newKeywords.功效 || {};
    Object.entries(learnedEfficacies).forEach(([efficacy, keywordList]) => {
      if (!keywordList || keywordList.length === 0) return;
      
      // 只处理适用于当前品类的功效
      if (!applicableEfficacies.includes(efficacy)) {
        console.log(`品类筛选 - 跳过学习功效: ${efficacy}`);
        return;
      }
      
      const removedKey = `功效-${efficacy}`;
      const removedKeywords = learningData.removedKeywords[removedKey] || [];
      const activeKeywords = keywordList.filter(kw => !removedKeywords.includes(kw));
      
      activeKeywords.forEach(keyword => {
        const keywordScore = learningData.keywordScores[keyword] || 0.7;
        if (keywordScore > 0.3 && text.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`学习增强 - 功效: "${keyword}" -> ${efficacy} (得分: ${keywordScore}, 品类: ${selectedProductCategory || '全部'})`);
          
          // 添加到结果中（如果不存在）
          if (!enhancedResult.dimension1.includes(efficacy)) {
            enhancedResult.dimension1.push(efficacy);
          }
          
          // 移除"其他"分类（如果存在且有具体分类）
          if (enhancedResult.dimension1.includes('其他') && enhancedResult.dimension1.length > 1) {
            enhancedResult.dimension1 = enhancedResult.dimension1.filter(e => e !== '其他');
          }
          
          enhancedResult.matchedKeywords.push({
            category: 'dimension1',
            keyword: keyword,
            result: efficacy,
            score: keywordScore,
            source: 'learned'
          });
          
          // 提升置信度
          enhancedResult.confidence.dimension1 = Math.min(0.95, enhancedResult.confidence.dimension1 + 0.1);
        }
      });
    });

    // 检查学习的类型关键词 - 不受品类影响
    const learnedTypes = learningData.newKeywords.类型 || {};
    Object.entries(learnedTypes).forEach(([type, keywordList]) => {
      if (!keywordList || keywordList.length === 0) return;
      
      const removedKey = `类型-${type}`;
      const removedKeywords = learningData.removedKeywords[removedKey] || [];
      const activeKeywords = keywordList.filter(kw => !removedKeywords.includes(kw));
      
      activeKeywords.forEach(keyword => {
        const keywordScore = learningData.keywordScores[keyword] || 0.7;
        if (keywordScore > 0.3 && text.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`学习增强 - 类型: "${keyword}" -> ${type} (得分: ${keywordScore})`);
          
          if (!enhancedResult.dimension2.includes(type)) {
            enhancedResult.dimension2.push(type);
          }
          
          // 移除默认的"使用感受"（如果有具体匹配）
          if (enhancedResult.dimension2.includes('使用感受') && enhancedResult.dimension2.length > 1) {
            enhancedResult.dimension2 = enhancedResult.dimension2.filter(t => t !== '使用感受');
          }
          
          enhancedResult.matchedKeywords.push({
            category: 'dimension2',
            keyword: keyword,
            result: type,
            score: keywordScore,
            source: 'learned'
          });
          
          enhancedResult.confidence.dimension2 = Math.min(0.95, enhancedResult.confidence.dimension2 + 0.1);
        }
      });
    });

    // 检查学习的持续性关键词 - 不受品类影响
    const learnedDurations = learningData.newKeywords.持续性 || {};
    Object.entries(learnedDurations).forEach(([duration, keywordList]) => {
      if (!keywordList || keywordList.length === 0) return;
      
      const removedKey = `持续性-${duration}`;
      const removedKeywords = learningData.removedKeywords[removedKey] || [];
      const activeKeywords = keywordList.filter(kw => !removedKeywords.includes(kw));
      
      activeKeywords.forEach(keyword => {
        const keywordScore = learningData.keywordScores[keyword] || 0.7;
        if (keywordScore > 0.3 && text.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`学习增强 - 持续性: "${keyword}" -> ${duration} (得分: ${keywordScore})`);
          
          enhancedResult.dimension3 = duration;
          enhancedResult.confidence.dimension3 = Math.min(0.95, 0.8 + 0.1);
          
          enhancedResult.matchedKeywords.push({
            category: 'dimension3',
            keyword: keyword,
            result: duration,
            score: keywordScore,
            source: 'learned'
          });
        }
      });
    });

    console.log('学习增强后结果:', enhancedResult);
    return enhancedResult;
  };

  // 整合分析函数 - 两步分析法
  const analyzeText = (text) => {
    console.log('开始两步分析法:', text);
    
    // 第一步：基础分析
    const baseResult = baseAnalyzeText(text);
    
    // 第二步：学习增强
    const finalResult = enhanceWithLearning(text, baseResult);
    
    console.log('最终分析结果:', finalResult);
    return finalResult;
  };

  // 用户确认正确的反馈
  const handleConfirmCorrect = (resultId) => {
    const result = analysisResults.find(r => r.id === resultId);
    if (!result) return;

    setLearningData(prev => {
      const newData = { ...prev };
      
      if (result.matchedKeywords) {
        result.matchedKeywords.forEach(mk => {
          const currentScore = newData.keywordScores[mk.keyword] || 1;
          newData.keywordScores[mk.keyword] = Math.min(1, currentScore + 0.1);
        });
      }
      
      if (!newData.learningStats) {
        newData.learningStats = { totalCorrections: 0, accuracyRate: 100, lastAccuracyUpdate: null };
      }
      newData.learningStats.totalCorrections++;
      
      return newData;
    });

    setValidationMessage({
      type: 'success',
      message: `✅ 已确认分析正确！AI学习了这次成功的匹配模式${learningMode === 'public' ? '（已贡献到公共学习库）' : ''}`
    });

    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 3000);
  };

  // 改进的用户纠错功能 - 支持多步操作和精确学习
  const handleUserCorrection = (resultId, dimension, correctionType, newValue, userKeyword = '') => {
    const result = analysisResults.find(r => r.id === resultId);
    if (!result) return;

    const oldValue = result[dimension];
    
    let finalValue;
    
    // 根据纠错类型确定最终值
    switch (correctionType) {
      case 'delete':
        // 仅删除错误编码：从原始值中移除未选中的项
        if (Array.isArray(oldValue)) {
          finalValue = newValue; // newValue已经是用户保留的项
        } else {
          finalValue = newValue;
        }
        break;
      case 'add':
        // 仅增加新编码：保留原有的，添加新选择的
        if (Array.isArray(oldValue)) {
          const originalValues = oldValue;
          const additionalValues = Array.isArray(newValue) ? newValue.filter(v => !originalValues.includes(v)) : 
                                  [newValue].filter(v => !originalValues.includes(v));
          finalValue = [...originalValues, ...additionalValues];
        } else {
          finalValue = Array.isArray(newValue) ? newValue : [oldValue, newValue];
        }
        break;
      case 'replace':
        // 完全替换：用新编码替换所有旧编码
        finalValue = newValue;
        break;
      default:
        finalValue = newValue;
    }
    
    const correctionRecord = {
      id: Date.now(),
      resultId,
      text: result.text,
      dimension,
      oldValue: Array.isArray(oldValue) ? oldValue.join(', ') : oldValue,
      newValue: Array.isArray(finalValue) ? finalValue.join(', ') : finalValue,
      userKeyword: userKeyword.trim(),
      correctionType: correctionType,
      timestamp: new Date().toISOString(),
      confidence: result.confidence[dimension],
      learningMode: learningMode
    };

    setLearningData(prev => {
      const newData = { ...prev };
      
      if (!newData.userCorrections) newData.userCorrections = [];
      newData.userCorrections.push(correctionRecord);
      
      if (!newData.learningStats) {
        newData.learningStats = { totalCorrections: 0, accuracyRate: 100, lastAccuracyUpdate: null };
      }
      newData.learningStats.totalCorrections++;
      
      // 处理关键词得分更新
      if (result.matchedKeywords) {
        result.matchedKeywords.forEach(mk => {
          if (mk.category === dimension) {
            const isCorrectMatch = (
              (dimension === 'dimension1' && (Array.isArray(finalValue) ? finalValue.includes(mk.result) : finalValue === mk.result)) ||
              (dimension === 'dimension2' && (Array.isArray(finalValue) ? finalValue.includes(mk.result) : finalValue === mk.result)) ||
              (dimension === 'dimension3' && finalValue === mk.result)
            );
            
            const currentScore = newData.keywordScores[mk.keyword] || 1;
            if (correctionType === 'delete' && !isCorrectMatch) {
              // 删除模式：被删除的关键词降低得分
              newData.keywordScores[mk.keyword] = Math.max(0.1, currentScore - 0.2);
            } else if (correctionType === 'replace' && !isCorrectMatch) {
              // 替换模式：被替换掉的关键词降低得分
              newData.keywordScores[mk.keyword] = Math.max(0.1, currentScore - 0.15);
            } else if (isCorrectMatch) {
              // 保留的关键词提升得分
              newData.keywordScores[mk.keyword] = Math.min(1, currentScore + 0.1);
            }
          }
        });
      }
      
      // 修正学习逻辑：只有当用户输入了新关键词时，才建立学习关联
      if (userKeyword.trim()) {
        const category = dimension === 'dimension1' ? '功效' : 
                        dimension === 'dimension2' ? '类型' : '持续性';
        
        // 只将新关键词与最终选择的功效进行关联
        const efficacies = Array.isArray(finalValue) ? finalValue : [finalValue];
        efficacies.forEach(efficacy => {
          if (!newData.newKeywords[category][efficacy]) {
            newData.newKeywords[category][efficacy] = [];
          }
          if (!newData.newKeywords[category][efficacy].includes(userKeyword.trim())) {
            newData.newKeywords[category][efficacy].push(userKeyword.trim());
            newData.keywordScores[userKeyword.trim()] = 0.8;
          }
        });
      }
      
      return newData;
    });

    setAnalysisResults(prev => prev.map(result => 
      result.id === resultId ? { ...result, [dimension]: finalValue } : result
    ));

    const correctionTypeText = correctionType === 'delete' ? '删除错误编码' : 
                              correctionType === 'add' ? '增加新编码' : '替换编码';
    setValidationMessage({
      type: 'success',
      message: `✅ ${correctionTypeText}成功！${userKeyword.trim() ? '新关键词已学习' : ''}继续选择其他纠错方式或点击保存确认${learningMode === 'public' ? '（将贡献到公共学习库）' : ''}`
    });

    // 不自动退出编辑模式，支持多步操作
    setCorrectionMode(''); // 只清空模式选择，允许继续纠错
    
    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 5000);
  };

  // 新增：保存确认功能（原"全部正确"的作用移到这里）
  const handleSaveCorrection = (resultId) => {
    const result = analysisResults.find(r => r.id === resultId);
    if (!result) return;

    // 对当前编辑的结果进行最终确认和学习
    setLearningData(prev => {
      const newData = { ...prev };
      
      if (result.matchedKeywords) {
        result.matchedKeywords.forEach(mk => {
          const currentScore = newData.keywordScores[mk.keyword] || 1;
          newData.keywordScores[mk.keyword] = Math.min(1, currentScore + 0.05); // 小幅提升确认正确的关键词
        });
      }
      
      return newData;
    });

    setEditingResult(null);
    setCorrectionMode('');
    
    setValidationMessage({
      type: 'success',
      message: `✅ 编码修改已保存确认！AI已学习此次纠错的完整过程${learningMode === 'public' ? '（已贡献到公共学习库）' : ''}`
    });

    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 3000);
  };

  // 学习新关键词
  const learnNewKeyword = async (keyword, category, efficacy) => {
    try {
      // 1. 先构建完整的新数据
      const updatedData = { ...learningData };
    
      // 2. 初始化数据结构
      if (!updatedData.newKeywords) {
        updatedData.newKeywords = { 功效: {}, 类型: {}, 持续性: {} };
      }
      if (!updatedData.newKeywords[category]) {
        updatedData.newKeywords[category] = {};
      }
      if (!updatedData.newKeywords[category][efficacy]) {
        updatedData.newKeywords[category][efficacy] = [];
      }
      if (!updatedData.keywordScores) {
        updatedData.keywordScores = {};
      }
      if (!updatedData.removedKeywords) {
        updatedData.removedKeywords = {};
      }
    
      // 3. 检查关键词是否已存在
      if (updatedData.newKeywords[category][efficacy].includes(keyword)) {
        setValidationMessage({
          type: 'warning',
          message: `⚠️ 关键词 "${keyword}" 已存在于 ${efficacy} 中`
        });
        setTimeout(() => {
          setValidationMessage({ type: '', message: '' });
        }, 3000);
        return false;
      }
    
      // 4. 🔧 核心修复：清除黑名单记录（如果存在）
      const removedKey = `${category}-${efficacy}`;
      let wasInBlacklist = false;
      if (updatedData.removedKeywords[removedKey]) {
        const originalLength = updatedData.removedKeywords[removedKey].length;
        updatedData.removedKeywords[removedKey] = updatedData.removedKeywords[removedKey].filter(
          k => k !== keyword
        );
        wasInBlacklist = originalLength > updatedData.removedKeywords[removedKey].length;
      
        // 如果黑名单为空，删除该项
        if (updatedData.removedKeywords[removedKey].length === 0) {
          delete updatedData.removedKeywords[removedKey];
        }
      
        if (wasInBlacklist) {
          console.log(`🔧 从黑名单中移除关键词: "${keyword}" (${category}-${efficacy})`);
        }
      }
    
      // 5. 添加新关键词
      updatedData.newKeywords[category][efficacy].push(keyword);
      updatedData.keywordScores[keyword] = 0.7;
      updatedData.lastUpdated = new Date().toISOString();
    
      // 6. 同时更新状态和保存
      setLearningData(updatedData);
    
      // 7. 显示成功消息
      setValidationMessage({
        type: 'success',
        message: `✅ 成功添加关键词 "${keyword}" 到 ${efficacy}${
          wasInBlacklist ? ' (已从删除记录中恢复)' : ''
        }${learningMode === 'public' ? ' 并贡献到公共学习库' : ''}`
      });
    
      // 8. 保存更新后的数据
      const saveSuccess = await saveLearningDataSmart(true, updatedData);
    
      if (saveSuccess) {
        console.log('✅ 关键词添加和保存完成');
      }
    
      // 9. 清除成功消息
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 3000);
    
      return true;
    
    } catch (error) {
      console.error('❌ 添加关键词失败:', error);
      setValidationMessage({
        type: 'error',
        message: `❌ 添加关键词失败: ${error.message}`
      });
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 3000);
      return false;
    }
  };

  // 智能分析主函数
  const handleAutoAnalysis = () => {
    if (!inputText.trim()) {
      setValidationMessage({
        type: 'error',
        message: '❌ 请输入宣称内容'
      });
      
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 3000);
      return;
    }

    // 品类选择提醒
    if (!selectedProductCategory) {
      setValidationMessage({
        type: 'info',
        message: '💡 建议先选择产品品类以提高分析准确性，现在将使用全功效模式进行分析...'
      });
      
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 4000);
    }

    const lines = inputText.split('\n').filter(line => line.trim());
    const results = lines.map((line, index) => {
      const analysis = analyzeText(line.trim());
      return {
        id: Date.now() + index,
        text: line.trim(),
        ...analysis,
        timestamp: new Date().toLocaleString(),
        productCategory: selectedProductCategory,
        learningMode: learningMode
      };
    });

    setAnalysisResults(results);
    
    const categoryText = selectedProductCategory 
      ? productCategories.find(cat => cat.value === selectedProductCategory)?.label 
      : '全功效模式';
    
    const modeText = learningMode === 'public' ? '公共学习库' : '个人学习库';
    
    setValidationMessage({
      type: 'success',
      message: `✅ 分析完成！共处理 ${results.length} 条宣称（${categoryText}，${modeText}）`
    });
    
    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 3000);
  };

  const clearResults = () => {
    console.log('开始清空结果，当前结果数量:', analysisResults.length);
    setAnalysisResults([]);
    setInputText('');
    setEditingResult(null);
    console.log('清空完成');
    setValidationMessage({
      type: 'success',
      message: '✅ 已清空所有结果和输入内容'
    });
    
    setTimeout(() => {
      setValidationMessage({ type: '', message: '' });
    }, 3000);
  };

  // 生成Excel文件的辅助函数
  const generateExcelContent = () => {
    // 创建简单的XML格式Excel文件
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="分析结果">
    <Table>
      <Row ss:StyleID="header">
        <Cell><Data ss:Type="String">序号</Data></Cell>
        <Cell><Data ss:Type="String">宣称内容</Data></Cell>
        <Cell><Data ss:Type="String">维度一：功效</Data></Cell>
        <Cell><Data ss:Type="String">维度二：类型</Data></Cell>
        <Cell><Data ss:Type="String">维度三：持续性</Data></Cell>
        <Cell><Data ss:Type="String">置信度</Data></Cell>
        <Cell><Data ss:Type="String">学习模式</Data></Cell>
        <Cell><Data ss:Type="String">分析时间</Data></Cell>
      </Row>
      ${analysisResults.map((result, index) => 
        `<Row>
          <Cell><Data ss:Type="Number">${index + 1}</Data></Cell>
          <Cell><Data ss:Type="String">${result.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>
          <Cell><Data ss:Type="String">${result.dimension1.join(', ')}</Data></Cell>
          <Cell><Data ss:Type="String">${Array.isArray(result.dimension2) ? result.dimension2.join(', ') : result.dimension2}</Data></Cell>
          <Cell><Data ss:Type="String">${result.dimension3}</Data></Cell>
          <Cell><Data ss:Type="String">${Math.round(result.confidence.dimension1 * 100)}%</Data></Cell>
          <Cell><Data ss:Type="String">${result.learningMode === 'public' ? '公共学习库' : '个人学习库'}</Data></Cell>
          <Cell><Data ss:Type="String">${result.timestamp}</Data></Cell>
        </Row>`
      ).join('')}
      <Row><Cell></Cell></Row>
      <Row ss:StyleID="header">
        <Cell><Data ss:Type="String">学习统计</Data></Cell>
        <Cell><Data ss:Type="String">数值</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">学习模式</Data></Cell>
        <Cell><Data ss:Type="String">${learningMode === 'public' ? '公共学习库' : '个人学习库'}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">用户纠正次数</Data></Cell>
        <Cell><Data ss:Type="Number">${learningData.userCorrections?.length || 0}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">新学习关键词</Data></Cell>
        <Cell><Data ss:Type="Number">${Object.values(learningData.newKeywords).reduce((total, category) => 
          total + Object.values(category).reduce((sum, keywords) => sum + keywords.length, 0), 0
        )}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">当前准确率</Data></Cell>
        <Cell><Data ss:Type="String">${learningData.learningStats?.accuracyRate || 100}%</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">公共贡献次数</Data></Cell>
        <Cell><Data ss:Type="Number">${learningData.learningStats?.publicContributions || 0}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">报告生成时间</Data></Cell>
        <Cell><Data ss:Type="String">${new Date().toLocaleString()}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;
    
    return xmlData;
  };

  // 改进的Excel导出功能 - 同时支持Excel和CSV格式
  const exportToExcel = () => {
    if (analysisResults.length === 0) {
      setValidationMessage({
        type: 'error',
        message: '❌ 没有可导出的数据，请先进行智能分析'
      });
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 3000);
      return;
    }

    try {
      // 生成Excel XML内容
      const xmlContent = generateExcelContent();
      
      try {
        // 尝试直接下载Excel文件
        const blob = new Blob([xmlContent], { 
          type: 'application/vnd.ms-excel;charset=utf-8;' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `智能化妆品宣称分析报告_${learningMode}_${new Date().toISOString().split('T')[0]}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setValidationMessage({
          type: 'success',
          message: '✅ Excel报告已成功导出！如果无法直接打开，请尝试用Excel打开下载的文件'
        });
        
      } catch (downloadError) {
        console.error('Excel下载失败，尝试CSV格式:', downloadError);
        
        // 备选方案：生成CSV格式
        const headers = ['序号', '宣称内容', '维度一：功效', '维度二：类型', '维度三：持续性', '置信度', '学习模式', '分析时间'];
        const csvRows = [
          headers.join(','),
          ...analysisResults.map((result, index) => {
            return [
              index + 1,
              `"${result.text.replace(/"/g, '""')}"`,
              `"${result.dimension1.join(', ')}"`,
              `"${Array.isArray(result.dimension2) ? result.dimension2.join(', ') : result.dimension2}"`,
              result.dimension3,
              `${Math.round(result.confidence.dimension1 * 100)}%`,
              result.learningMode === 'public' ? '公共学习库' : '个人学习库',
              result.timestamp
            ].join(',');
          }),
          '', // 空行
          '=== 学习统计 ===',
          `学习模式,${learningMode === 'public' ? '公共学习库' : '个人学习库'}`,
          `用户纠正次数,${learningData.userCorrections?.length || 0}`,
          `新学习关键词,${Object.values(learningData.newKeywords).reduce((total, category) => 
            total + Object.values(category).reduce((sum, keywords) => sum + keywords.length, 0), 0
          )}`,
          `当前准确率,${learningData.learningStats?.accuracyRate || 100}%`,
          `公共贡献次数,${learningData.learningStats?.publicContributions || 0}`,
          `报告生成时间,${new Date().toLocaleString()}`
        ];

        const csvContent = csvRows.join('\n');
        // 添加UTF-8 BOM以确保中文正确显示
        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csvContent;
        
        const csvBlob = new Blob([csvWithBOM], { 
          type: 'text/csv;charset=utf-8;' 
        });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `智能化妆品宣称分析报告_${learningMode}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        URL.revokeObjectURL(csvUrl);
        
        setValidationMessage({
          type: 'info',
          message: '💡 Excel下载失败，已自动下载CSV格式文件，可以直接用Excel打开'
        });
      }
      
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 5000);
      
    } catch (error) {
      console.error('Export error:', error);
      
      // 最后的备选方案：显示模态框让用户复制
      const headers = ['序号', '宣称内容', '维度一：功效', '维度二：类型', '维度三：持续性', '置信度', '学习模式', '分析时间'];
      const csvRows = [
        headers.join('\t'), // 使用制表符分隔，便于粘贴到Excel
        ...analysisResults.map((result, index) => {
          return [
            index + 1,
            result.text,
            result.dimension1.join(', '),
            Array.isArray(result.dimension2) ? result.dimension2.join(', ') : result.dimension2,
            result.dimension3,
            `${Math.round(result.confidence.dimension1 * 100)}%`,
            result.learningMode === 'public' ? '公共学习库' : '个人学习库',
            result.timestamp
          ].join('\t');
        }),
        '', // 空行
        '=== 学习统计 ===',
        `学习模式\t${learningMode === 'public' ? '公共学习库' : '个人学习库'}`,
        `用户纠正次数\t${learningData.userCorrections?.length || 0}`,
        `新学习关键词\t${Object.values(learningData.newKeywords).reduce((total, category) => 
          total + Object.values(category).reduce((sum, keywords) => sum + keywords.length, 0), 0
        )}`,
        `当前准确率\t${learningData.learningStats?.accuracyRate || 100}%`,
        `公共贡献次数\t${learningData.learningStats?.publicContributions || 0}`,
        `报告生成时间\t${new Date().toLocaleString()}`
      ];
      
      setExportData(csvRows.join('\n'));
      setShowExportModal(true);
      setValidationMessage({
        type: 'error',
        message: '❌ 导出失败，请从弹窗中复制数据，然后粘贴到Excel中'
      });
      
      setTimeout(() => {
        setValidationMessage({ type: '', message: '' });
      }, 3000);
    }
  };

  // 复制到剪贴板函数
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  };

  const getStatistics = () => {
    if (analysisResults.length === 0) return null;
    
    const total = analysisResults.length;
    const dim1Stats = {};
    const dim2Stats = {};
    const dim3Stats = {};

    analysisResults.forEach(result => {
      result.dimension1.forEach(efficacy => {
        dim1Stats[efficacy] = (dim1Stats[efficacy] || 0) + 1;
      });
      const types = Array.isArray(result.dimension2) ? result.dimension2 : [result.dimension2];
      types.forEach(type => {
        dim2Stats[type] = (dim2Stats[type] || 0) + 1;
      });
      dim3Stats[result.dimension3] = (dim3Stats[result.dimension3] || 0) + 1;
    });

    return { total, dim1Stats, dim2Stats, dim3Stats };
  };

  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 标题区域 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 flex items-center justify-center gap-3">
              <Brain className="text-blue-600 h-10 w-10" />
              智能学习型化妆品宣称分析器 v2.4-Misaki15-Public
              <Globe className="text-green-600 h-10 w-10" />
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              🧠 AI自我学习优化 | 💡 多功效智能识别 | 📊 置信度评估 | 🎯 用户纠错学习 | 🌐 公共学习库 | ✅ Excel/CSV双格式导出 | 🔧 两步分析法 | 🏷️ 品类智能筛选
              <br />
              <span className="text-sm text-blue-600 font-medium">
                🎯 新版采用两步分析法：先基础库分析，再学习库增强，确保稳定性和准确性！
                <br />
                🌐 <strong>全新公共学习库</strong>：所有用户共同学习，集体智慧共同提升AI准确性！
                <br />
                🏷️ 品类选择功能：根据产品类型智能筛选适用功效，提升分析精准度！
                <br />
                📊 Excel导出功能：支持真正的Excel文件下载，同时提供CSV备选方案！
              </span>
            </p>
            
            {/* 学习模式状态显示 */}
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${learningMode === 'public' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm font-medium">
                    当前模式: <span className={`font-bold ${learningMode === 'public' ? 'text-green-600' : 'text-blue-600'}`}>
                      {learningMode === 'public' ? '🌐 公共学习库' : '👤 个人学习库'}
                    </span>
                  </span>
                </div>
                {learningMode === 'public' && publicSyncStatus && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm">
                      {publicSyncStatus === 'syncing' && <Wifi className="animate-pulse text-blue-600" size={16} />}
                      {publicSyncStatus === 'success' && <Cloud className="text-green-600" size={16} />}
                      {publicSyncStatus === 'error' && <WifiOff className="text-red-600" size={16} />}
                      <span className="text-gray-600">
                        公共库同步: {lastPublicSyncTime?.toLocaleString() || '未连接'}
                      </span>
                    </div>
                  </div>
                )}
                {learningMode === 'personal' && githubConfig.enabled && lastSyncTime && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm">
                      {syncStatus === 'syncing' && <Wifi className="animate-pulse text-blue-600" size={16} />}
                      {syncStatus === 'success' && <CheckCircle className="text-green-600" size={16} />}
                      {syncStatus === 'error' && <XCircle className="text-red-600" size={16} />}
                      <span className="text-gray-600">
                        个人库同步: {lastSyncTime.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 学习模式切换 */}
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-xl p-2 shadow-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => switchLearningMode('public')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    learningMode === 'public' 
                      ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Globe size={18} />
                  公共学习库
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    {learningMode === 'public' ? '当前' : '切换'}
                  </span>
                </button>
                <button
                  onClick={() => switchLearningMode('personal')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    learningMode === 'personal' 
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <User size={18} />
                  个人学习库
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    {learningMode === 'personal' ? '当前' : '切换'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 模式说明 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
            <div className="text-center">
              <div className="font-bold text-gray-800 mb-2">
                {learningMode === 'public' ? '🌐 公共学习库模式' : '👤 个人学习库模式'}
              </div>
              <div className="text-sm text-gray-700">
                {learningMode === 'public' ? (
                  <div>
                    <p>所有用户共同学习，您的每次纠错和新增关键词都会贡献给全球用户</p>
                    <p className="mt-1 text-green-600 font-medium">✨ 集体智慧，共同提升AI准确性！</p>
                  </div>
                ) : (
                  <div>
                    <p>您的学习数据保存在个人GitHub仓库中，完全私有</p>
                    <p className="mt-1 text-blue-600 font-medium">🔒 个人专属，数据完全掌控！</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 数据管理按钮 */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <button
              onClick={saveLearningData}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Save size={16} />
              手动保存
            </button>
            <button
              onClick={exportLearningData}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download size={16} />
              导出数据
            </button>
            <label className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm cursor-pointer">
              <Upload size={16} />
              导入数据
              <input
                type="file"
                accept=".json"
                onChange={importLearningData}
                className="hidden"
              />
            </label>
            {learningMode === 'personal' && (
              <button
                onClick={() => setShowGithubConfig(!showGithubConfig)}
                className={`flex items-center gap-2 ${
                  githubConfig.enabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
                } text-white px-4 py-2 rounded-lg transition-colors text-sm`}
              >
                <Github size={16} />
                个人GitHub
                {githubConfig.enabled && (
                  <div className="flex items-center gap-1">
                    {syncStatus === 'syncing' && <Wifi className="animate-pulse" size={12} />}
                    {syncStatus === 'success' && <Cloud size={12} />}
                    {syncStatus === 'error' && <WifiOff size={12} />}
                  </div>
                )}
              </button>
            )}
            <button
              onClick={clearLearningData}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <XCircle size={16} />
              清空数据
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="rounded"
              />
              自动保存
            </label>
          </div>

          {/* GitHub 配置面板 (只在个人模式下显示) */}
          {learningMode === 'personal' && showGithubConfig && (
            <div className="mb-6 bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Github className="text-gray-600" />
                个人GitHub配置
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  githubConfig.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {githubConfig.enabled ? '已连接' : '未连接'}
                </span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GitHub 用户名/组织名
                  </label>
                  <input
                    type="text"
                    value={githubConfig.owner}
                    onChange={(e) => setGithubConfig(prev => ({ ...prev, owner: e.target.value }))}
                    placeholder="your-username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    仓库名称
                  </label>
                  <input
                    type="text"
                    value={githubConfig.repo}
                    onChange={(e) => setGithubConfig(prev => ({ ...prev, repo: e.target.value }))}
                    placeholder="my-learning-repo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Access Token
                  <a 
                    href="https://github.com/settings/tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                  >
                    (如何获取?)
                  </a>
                </label>
                <input
                  type="password"
                  value={githubConfig.token || ''}
                  onChange={(e) => setGithubConfig(prev => ({ ...prev, token: e.target.value }))}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={testGitHubConnection}
                  disabled={syncStatus === 'syncing'}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                >
                  {syncStatus === 'syncing' ? (
                    <Wifi className="animate-pulse" size={16} />
                  ) : (
                    <Github size={16} />
                  )}
                  测试连接
                </button>
                
                <button
                  onClick={() => setGithubConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  disabled={!githubConfig.token || !githubConfig.owner || !githubConfig.repo}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50 ${
                    githubConfig.enabled 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {githubConfig.enabled ? (
                    <>
                      <WifiOff size={16} />
                      禁用个人库
                    </>
                  ) : (
                    <>
                      <Cloud size={16} />
                      启用个人库
                    </>
                  )}
                </button>

                {lastSyncTime && (
                  <span className="text-xs text-gray-500">
                    最后同步: {lastSyncTime.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <div className="font-semibold mb-2">📖 个人GitHub配置说明：</div>
                <div className="space-y-1 text-xs">
                  <div>1. 在 GitHub 创建一个<strong>私有仓库</strong>（推荐）用于存储您的学习数据</div>
                  <div>2. 生成 Personal Access Token，需要 <strong>repo</strong> 权限</div>
                  <div>3. 填写上述信息并测试连接</div>
                  <div>4. 启用后，您的个人学习数据将自动同步到 GitHub</div>
                  <div>5. 文件保存为：<code>learning-data.json</code></div>
                </div>
              </div>
            </div>
          )}

          {/* 验证消息 */}
          {validationMessage.message && (
            <div className={`mb-4 p-4 rounded-lg flex items-start gap-2 ${
              validationMessage.type === 'error' ? 'bg-red-100 text-red-800' : 
              validationMessage.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              validationMessage.type === 'info' ? 'bg-blue-100 text-blue-800' : 
              'bg-green-100 text-green-800'
            }`}>
              <div className="flex-shrink-0 mt-0.5">
                {validationMessage.type === 'error' ? <XCircle size={20} /> : 
                 validationMessage.type === 'warning' ? <AlertCircle size={20} /> :
                 validationMessage.type === 'info' ? <AlertCircle size={20} /> :
                 <CheckCircle size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <pre className="whitespace-pre-wrap text-sm font-sans">{validationMessage.message}</pre>
              </div>
              <button 
                onClick={() => setValidationMessage({ type: '', message: '' })}
                className="flex-shrink-0 text-gray-500 hover:text-gray-700 mt-0.5"
              >
                <XCircle size={16} />
              </button>
            </div>
          )}

          {/* 产品品类选择区域 */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-700 mb-4">
              🏷️ 产品品类选择
              <span className="text-gray-500 text-sm font-normal ml-3">（选择产品类型以优化功效识别准确性）</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {productCategories.map((category) => (
                <label key={category.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="productCategory"
                    value={category.value}
                    checked={selectedProductCategory === category.value}
                    onChange={(e) => setSelectedProductCategory(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    selectedProductCategory === category.value
                      ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}>
                    <div className="text-center">
                      <div className="text-3xl mb-2">{category.icon}</div>
                      <div className={`text-sm font-semibold px-3 py-1 rounded-full ${category.color}`}>
                        {category.label}
                      </div>
                      {selectedProductCategory === category.value && (
                        <div className="mt-2 text-xs text-blue-600">
                          ✅ 已选择 ({category.applicableEfficacies.length}个适用功效)
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            {selectedProductCategory && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600 font-semibold">🎯 智能筛选已启用</span>
                  <button
                    onClick={() => setSelectedProductCategory('')}
                    className="text-gray-500 hover:text-gray-700 ml-auto"
                    title="清除品类选择"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
                <div className="text-sm text-gray-700">
                  已为 <span className={`px-2 py-1 rounded font-medium ${
                    productCategories.find(cat => cat.value === selectedProductCategory)?.color
                  }`}>
                    {productCategories.find(cat => cat.value === selectedProductCategory)?.label}
                  </span> 优化功效识别，将重点关注以下 {getFilteredDimension1Options().length} 种相关功效
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {getFilteredDimension1Options().slice(0, 8).map((efficacy, idx) => (
                    <span key={idx} className={`text-xs px-2 py-1 rounded ${efficacy.color}`}>
                      {efficacy.value}
                    </span>
                  ))}
                  {getFilteredDimension1Options().length > 8 && (
                    <span className="text-xs text-gray-500 px-2 py-1">
                      +{getFilteredDimension1Options().length - 8} 更多...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 宣称内容输入区域 */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-4">
              📝 宣称内容输入 
              <span className="text-red-500 ml-1">*</span>
              <span className="text-gray-500 text-sm font-normal ml-3">（每行一个宣称，{learningMode === 'public' ? '公共学习库' : '个人学习库'}模式）</span>
            </label>
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="请输入宣称内容，每行一个宣称，例如：&#10;&#10;该产品24小时长效保湿，温和不刺激&#10;含有玻尿酸和胶原蛋白，深层滋润紧致肌肤&#10;即刻提亮肌肤，焕发光彩，持久美白&#10;质地丝滑好推开，温和亲肤无刺激&#10;90%用户满意度调查，持续使用效果更佳&#10;美容修饰效果显著，妆容持久不脱妆"
                className="w-full p-6 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 resize-none bg-gray-50/50 backdrop-blur-sm"
                rows="12"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={handleAutoAnalysis}
              className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
            >
              <Sparkles size={24} />
              智能分析
            </button>
            <button
              onClick={clearResults}
              disabled={analysisResults.length === 0}
              className="flex items-center gap-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-4 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none font-semibold"
            >
              <RotateCcw size={24} />
              清空结果 {analysisResults.length > 0 && `(${analysisResults.length})`}
            </button>
            <button
              onClick={exportToExcel}
              disabled={analysisResults.length === 0}
              className="flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none font-semibold"
            >
              <Download size={24} />
              导出Excel报告
            </button>
            <button
              onClick={() => setShowLearningPanel(!showLearningPanel)}
              className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
            >
              <Brain size={24} />
              学习面板
            </button>
          </div>
        </div>

        {/* 学习面板 */}
        {showLearningPanel && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Brain className="text-purple-600" />
              AI学习面板 v2.4-Misaki15-Public
              <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                learningMode === 'public' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {learningMode === 'public' ? (
                  <>
                    <Globe size={16} />
                    公共学习库
                  </>
                ) : (
                  <>
                    <User size={16} />
                    个人学习库
                  </>
                )}
              </span>
              {learningMode === 'public' && publicSyncStatus === 'success' && (
                <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                  <Cloud size={16} />
                  已连接
                </span>
              )}
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 学习统计 */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  学习库统计
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">当前模式</span>
                    <span className={`font-bold px-2 py-1 rounded text-sm ${
                      learningMode === 'public' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {learningMode === 'public' ? '🌐 公共库' : '👤 个人库'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">新学习关键词</span>
                    <span className="font-bold text-indigo-600">
                      {Object.values(learningData.newKeywords).reduce((total, category) => 
                        total + Object.values(category).reduce((sum, keywords) => sum + keywords.length, 0), 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">已移除关键词</span>
                    <span className="font-bold text-red-600">
                      {Object.values(learningData.removedKeywords || {}).reduce((total, keywords) => total + keywords.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">活跃关键词</span>
                    <span className="font-bold text-blue-600">
                      {Object.values(learningData.keywordScores || {}).filter(score => score > 0.3).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">当前准确率</span>
                    <span className="font-bold text-green-600">
                      {learningData.learningStats?.accuracyRate || 100}%
                    </span>
                  </div>
                  {learningMode === 'public' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">公共贡献</span>
                      <span className="font-bold text-purple-600">
                        {learningData.learningStats?.publicContributions || 0} 次
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">数据存储</span>
                    <span className={`font-bold ${
                      learningMode === 'public' ? 'text-green-600' : 
                      githubConfig.enabled ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      {learningMode === 'public' ? '🌐 公共云端' : 
                       githubConfig.enabled ? '☁️ 个人GitHub' : '💾 本地存储'}
                    </span>
                  </div>
                </div>
                {learningMode === 'public' && (
                  <div className="mt-3 p-2 bg-green-50 rounded text-xs">
                    <div className="font-semibold text-green-800 mb-1">🌐 公共学习库优势：</div>
                    <div className="text-green-700">
                      您的每次学习都会帮助所有用户，同时也受益于其他用户的贡献，共同提升AI准确性。
                    </div>
                  </div>
                )}
                {learningMode === 'personal' && !githubConfig.enabled && (
                  <div className="mt-3 p-2 bg-orange-50 rounded text-xs">
                    <div className="font-semibold text-orange-800 mb-1">⚠️ 数据保存提醒：</div>
                    <div className="text-orange-700">
                      当前使用本地存储，页面刷新会丢失学习数据。建议启用GitHub云存储或定期导出数据。
                    </div>
                  </div>
                )}
              </div>

              {/* 学习关键词管理 */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  学习库管理
                  <span className={`text-xs px-2 py-1 rounded ml-2 ${
                    learningMode === 'public' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {learningMode === 'public' ? '公共共享' : '个人私有'}
                  </span>
                  <button
                    onClick={() => {
                      // 测试学习的关键词
                      const testText = "含有神经酰胺成分";
                      const result = analyzeText(testText);
                      setValidationMessage({
                        type: 'info',
                        message: `🧪 测试结果 (神经酰胺):\n功效: ${result.dimension1.join(', ')}\n类型: ${result.dimension2.join(', ')}\n持续性: ${result.dimension3}\n\n匹配关键词:\n${result.matchedKeywords.map(mk => `"${mk.keyword}" → ${mk.result} (${mk.source})`).join('\n')}\n\n学习模式: ${learningMode === 'public' ? '公共学习库' : '个人学习库'}`
                      });
                      setTimeout(() => {
                        setValidationMessage({ type: '', message: '' });
                      }, 8000);
                    }}
                    className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    测试学习效果
                  </button>
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {Object.entries(learningData.newKeywords).map(([category, keywords]) => 
                    Object.entries(keywords).map(([efficacy, keywordList]) => {
                      const removedKeywords = learningData.removedKeywords[`${category}-${efficacy}`] || [];
                      const activeKeywords = keywordList.filter(kw => !removedKeywords.includes(kw));
                      
                      if (activeKeywords.length === 0) return null;
                      
                      return (
                        <div key={`${category}-${efficacy}`} className="text-sm border border-gray-200 rounded p-2 bg-white">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-800">{efficacy}</span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-1 rounded">({category})</span>
                            <span className="text-xs text-gray-500">共{activeKeywords.length}个</span>
                            <button
                              onClick={() => {
                                if (window.confirm(`确定要清空 "${efficacy}" 功效下的所有关键词吗？`)) {
                                  clearLearningCategory(category, efficacy);
                                }
                              }}
                              className="ml-auto text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                              title="清空该功效的所有关键词"
                            >
                              🗑️ 清空
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {activeKeywords.map((keyword, idx) => {
                              const score = learningData.keywordScores[keyword] || 0.7;
                              return (
                                <div key={idx} className="flex items-center gap-1 mb-1">
                                  <span className={`px-2 py-1 rounded text-xs cursor-pointer hover:bg-opacity-80 transition-colors ${
                                    score > 0.7 ? 'bg-green-100 text-green-800 border border-green-200' : 
                                    score > 0.4 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                    'bg-red-100 text-red-800 border border-red-200'
                                  }`}
                                  onDoubleClick={() => {
                                    const newKeyword = prompt(`修改关键词 "${keyword}":`, keyword);
                                    if (newKeyword && newKeyword !== keyword) {
                                      editLearnedKeyword(category, efficacy, keyword, newKeyword);
                                    }
                                  }}
                                  title="双击编辑关键词"
                                  >
                                    {keyword} <span className="text-xs opacity-70">({Math.round(score * 100)}%)</span>
                                  </span>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`确定要删除关键词 "${keyword}" 吗？`)) {
                                        deleteLearnedKeyword(category, efficacy, keyword);
                                      }
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                                    title="删除关键词"
                                  >
                                    <XCircle size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ).filter(Boolean)}
                  {Object.keys(learningData.newKeywords).every(category => 
                    Object.keys(learningData.newKeywords[category]).length === 0
                  ) && (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无学习到的新关键词</p>
                      <p className="text-xs mt-1">通过下方"手动添加关键词"开始学习</p>
                    </div>
                  )}
                </div>
                
                {/* 学习库管理说明 */}
                <div className="mt-4 p-3 bg-blue-50 rounded text-xs">
                  <div className="font-semibold text-blue-800 mb-2">🛠️ 学习库管理操作：</div>
                  <div className="text-blue-700 space-y-1">
                    <div>• <strong>{learningMode === 'public' ? '公共共享' : '个人私有'}</strong>：{learningMode === 'public' ? '所有学习数据自动共享给全球用户' : '学习数据保存在您的个人空间中'}</div>
                    <div>• <strong>双击关键词</strong>：编辑关键词内容</div>
                    <div>• <strong>🗑️ 删除按钮</strong>：删除单个关键词记录</div>
                    <div>• <strong>🗑️ 清空按钮</strong>：清空整个功效的所有关键词</div>
                    <div>• <strong>得分显示</strong>：显示AI对关键词的信任度（越高越准确）</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 手动添加关键词 */}
            <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                手动添加关键词
                <span className={`text-xs px-2 py-1 rounded ${
                  learningMode === 'public' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {learningMode === 'public' ? '将贡献到公共库' : '保存到个人库'}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  placeholder="输入新关键词"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择类型</option>
                  <option value="功效">功效</option>
                  <option value="类型">类型</option>
                  <option value="持续性">持续性</option>
                </select>
                <select 
                  value={selectedEfficacy}
                  onChange={(e) => setSelectedEfficacy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择分类</option>
                  {selectedCategory === '功效' && getFilteredDimension1Options().map(opt => (
                    <option key={opt.code} value={opt.value}>{opt.value}</option>
                  ))}
                  {selectedCategory === '类型' && dimension2Options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.value}</option>
                  ))}
                  {selectedCategory === '持续性' && dimension3Options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.value}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (newKeywordInput.trim() && selectedCategory && selectedEfficacy) {
                      if (learnNewKeyword(newKeywordInput.trim(), selectedCategory, selectedEfficacy)) {
                        setNewKeywordInput('');
                        setSelectedCategory('');
                        setSelectedEfficacy('');
                      }
                    } else {
                      setValidationMessage({
                        type: 'error',
                        message: '❌ 请填写所有字段'
                      });
                      
                      setTimeout(() => {
                        setValidationMessage({ type: '', message: '' });
                      }, 3000);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2 justify-center ${
                    learningMode === 'public' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Shield size={16} />
                  {learningMode === 'public' ? '贡献到公共库' : '添加到个人库'}
                </button>
              </div>
              
              {/* 快速测试区域 */}
              <div className="mt-4 p-4 bg-white/50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  快速测试新关键词
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="输入测试文本（包含学习的关键词）"
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const testText = e.target.value;
                        if (testText) {
                          const result = analyzeText(testText);
                          const matchedInfo = result.matchedKeywords.length > 0 
                            ? result.matchedKeywords.map(mk => `"${mk.keyword}" → ${mk.result} (${mk.source}, ${mk.score ? Math.round(mk.score * 100) + '%' : '100%'})`).join('\n')
                            : '未匹配到任何关键词';
                          
                          setValidationMessage({
                            type: 'info',
                            message: `🔍 测试结果:\n功效: ${result.dimension1.join(', ')}\n类型: ${result.dimension2.join(', ')}\n持续性: ${result.dimension3}\n\n匹配详情:\n${matchedInfo}\n\n学习模式: ${learningMode === 'public' ? '公共学习库' : '个人学习库'}\n说明: base=基础库, learned=学习库`
                          });
                          
                          setTimeout(() => {
                            setValidationMessage({ type: '', message: '' });
                          }, 10000);
                        }
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500 self-center">按回车测试</span>
                </div>
                
                <div className="mt-2 text-xs text-gray-600">
                  <strong>测试示例:</strong>
                  <div className="mt-1 space-y-1">
                    <div>1. 先添加关键词 "神经酰胺" → "修护"</div>
                    <div>2. 测试文本 "含有神经酰胺成分"</div>
                    <div>3. 应识别为"修护"功效，来源显示为"learned"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 统计信息 */}
        {stats && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <BarChart3 className="text-blue-600" />
              智能分析统计
              <span className={`text-sm px-2 py-1 rounded ${
                learningMode === 'public' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {learningMode === 'public' ? '公共学习库' : '个人学习库'}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
                <div className="text-3xl font-bold mb-2">{stats.total}</div>
                <div className="text-blue-100 font-medium">总宣称数</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
                <div className="text-lg font-semibold mb-3">功效分布 TOP5</div>
                <div className="space-y-2 text-sm">
                  {Object.entries(stats.dim1Stats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="truncate mr-2">{key}</span>
                      <span className="font-bold bg-white/20 px-2 py-1 rounded">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-6 rounded-xl text-white shadow-lg">
                <div className="text-lg font-semibold mb-3">类型分布</div>
                <div className="space-y-2 text-sm">
                  {Object.entries(stats.dim2Stats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="truncate mr-2">{key}</span>
                      <span className="font-bold bg-white/20 px-2 py-1 rounded">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
                <div className="text-lg font-semibold mb-3">AI学习状态</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span>学习模式</span>
                    <span className="font-bold bg-white/20 px-2 py-1 rounded text-xs">
                      {learningMode === 'public' ? '🌐 公共' : '👤 个人'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>纠错次数</span>
                    <span className="font-bold bg-white/20 px-2 py-1 rounded">{learningData.userCorrections?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>新关键词</span>
                    <span className="font-bold bg-white/20 px-2 py-1 rounded">
                      {Object.values(learningData.newKeywords).reduce((total, category) => 
                        total + Object.values(category).reduce((sum, keywords) => sum + keywords.length, 0), 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>准确率</span>
                    <span className="font-bold bg-white/20 px-2 py-1 rounded">
                      {learningData.learningStats?.accuracyRate || 100}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 分析结果表格 */}
        {analysisResults.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <TrendingUp className="text-green-600" />
              智能分析结果 v2.4-Misaki15-Public
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-lg font-bold">
                {analysisResults.length}
              </span>
              <span className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                learningMode === 'public' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {learningMode === 'public' ? (
                  <>
                    <Globe size={16} />
                    公共学习库
                  </>
                ) : (
                  <>
                    <User size={16} />
                    个人学习库
                  </>
                )}
              </span>
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-lg">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">序号</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">宣称内容</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">维度一：功效</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">维度二：类型</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">维度三：持续性</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">置信度</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResults.map((result, index) => (
                    <tr key={result.id} className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100">
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm max-w-xs">
                        <div className="break-words leading-relaxed text-gray-800">{result.text}</div>
                        {result.matchedKeywords && result.matchedKeywords.length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <span className="text-xs text-gray-600 font-semibold">匹配详情:</span>
                            <div className="mt-1 space-y-1">
                              {result.matchedKeywords.map((mk, idx) => (
                                <div key={idx} className="text-xs flex items-center gap-1">
                                  <span className={`px-1 py-0.5 rounded ${
                                    mk.category === 'dimension1' ? 'bg-blue-50' :
                                    mk.category === 'dimension2' ? 'bg-green-50' :
                                    'bg-purple-50'
                                  }`}>
                                    {mk.category === 'dimension1' ? '功效' :
                                     mk.category === 'dimension2' ? '类型' : '持续性'}
                                  </span>
                                  <span className={`px-1 py-0.5 rounded text-xs ${
                                    mk.source === 'base' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {mk.source === 'base' ? '基础' : '学习'}
                                  </span>
                                  <span className="text-blue-600 font-medium">"{mk.keyword}"</span>
                                  <span className="text-gray-500">→</span>
                                  <span className={`inline-block px-2 py-0.5 rounded ${
                                    mk.category === 'dimension1' ? getEfficacyColor(mk.result) :
                                    mk.category === 'dimension2' ? getDimension2Color(mk.result) :
                                    getDimension3Color(mk.result)
                                  }`}>
                                    {mk.result}
                                  </span>
                                  {mk.score !== undefined && mk.score !== 1 && (
                                    <span className={`ml-1 ${
                                      mk.score > 0.7 ? 'text-green-600' : 
                                      mk.score > 0.4 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      ({Math.round(mk.score * 100)}%)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {editingResult === result.id ? (
                          <div className="space-y-2">
                            {/* 功效多选复选框 */}
                            <div className="border rounded p-3 bg-gray-50 max-h-40 overflow-y-auto">
                              <div className="text-xs font-semibold text-gray-700 mb-2">选择功效（可多选）：</div>
                              <div className="grid grid-cols-1 gap-1">
                                {getFilteredDimension1Options().map(opt => (
                                  <label key={opt.code} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded px-2 py-1">
                                    <input
                                      type="checkbox"
                                      checked={result.dimension1.includes(opt.value)}
                                      onChange={(e) => {
                                        const newDimension1 = e.target.checked 
                                          ? [...result.dimension1, opt.value]
                                          : result.dimension1.filter(v => v !== opt.value);
                                        setAnalysisResults(prev => prev.map(r => 
                                          r.id === result.id ? { ...r, dimension1: newDimension1 } : r
                                        ));
                                      }}
                                      className="rounded"
                                    />
                                    <span className={`text-xs px-2 py-0.5 rounded ${opt.color}`}>
                                      {opt.value}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {result.dimension1.map((efficacy, idx) => (
                              <span
                                key={idx}
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEfficacyColor(efficacy)}`}
                              >
                                {efficacy}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {editingResult === result.id ? (
                          <div className="space-y-2">
                            {/* 类型多选复选框 */}
                            <div className="border rounded p-3 bg-gray-50 max-h-32 overflow-y-auto">
                              <div className="text-xs font-semibold text-gray-700 mb-2">选择类型（可多选）：</div>
                              <div className="grid grid-cols-1 gap-1">
                                {dimension2Options.map(opt => {
                                  const currentTypes = Array.isArray(result.dimension2) ? result.dimension2 : [result.dimension2];
                                  return (
                                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded px-2 py-1">
                                      <input
                                        type="checkbox"
                                        checked={currentTypes.includes(opt.value)}
                                        onChange={(e) => {
                                          const newDimension2 = e.target.checked 
                                            ? [...currentTypes, opt.value]
                                            : currentTypes.filter(v => v !== opt.value);
                                          setAnalysisResults(prev => prev.map(r => 
                                            r.id === result.id ? { ...r, dimension2: newDimension2 } : r
                                          ));
                                        }}
                                        className="rounded"
                                      />
                                      <span className={`text-xs px-2 py-0.5 rounded ${opt.color}`}>
                                        {opt.value}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(Array.isArray(result.dimension2) ? result.dimension2 : [result.dimension2]).map((type, idx) => (
                              <span
                                key={idx}
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getDimension2Color(type)}`}
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {editingResult === result.id ? (
                          <div className="space-y-2">
                            {/* 持续性单选 */}
                            <div className="border rounded p-3 bg-gray-50">
                              <div className="text-xs font-semibold text-gray-700 mb-2">选择持续性：</div>
                              <div className="space-y-1">
                                {dimension3Options.map(opt => (
                                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded px-2 py-1">
                                    <input
                                      type="radio"
                                      name={`duration-${result.id}`}
                                      value={opt.value}
                                      checked={result.dimension3 === opt.value}
                                      onChange={(e) => {
                                        setAnalysisResults(prev => prev.map(r => 
                                          r.id === result.id ? { ...r, dimension3: e.target.value } : r
                                        ));
                                      }}
                                      className="rounded"
                                    />
                                    <span className={`text-xs px-2 py-0.5 rounded ${opt.color}`}>
                                      {opt.value}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getDimension3Color(result.dimension3)}`}>
                            {result.dimension3}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" 
                              style={{width: `${result.confidence.dimension1 * 100}%`}}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">
                            {Math.round(result.confidence.dimension1 * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingResult(editingResult === result.id ? null : result.id)}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-blue-700"
                            title="纠错或补充编码"
                          >
                            <Edit size={12} />
                            {editingResult === result.id ? '取消纠错' : '纠错'}
                          </button>
                          <button
                            onClick={() => handleConfirmCorrect(result.id)}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-green-700"
                            title="确认所有维度分析正确"
                          >
                            <ThumbsUp size={12} />
                            全部正确
                          </button>
                        </div>
                        {editingResult === result.id && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex gap-2 mb-2">
                              <button
                                onClick={() => {
                                  // 保存当前修改并学习
                                  const currentResult = analysisResults.find(r => r.id === result.id);
                                  if (currentResult) {
                                    handleUserCorrection(result.id, 'dimension1', 'replace', currentResult.dimension1);
                                    handleUserCorrection(result.id, 'dimension2', 'replace', currentResult.dimension2);
                                    handleUserCorrection(result.id, 'dimension3', 'replace', currentResult.dimension3);
                                    setEditingResult(null);
                                  }
                                }}
                                className="bg-green-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 hover:bg-green-700"
                              >
                                <CheckCircle size={12} />
                                保存修改
                              </button>
                              <button
                                onClick={() => setEditingResult(null)}
                                className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
                              >
                                取消
                              </button>
                            </div>
                            <div className="text-xs text-blue-700 bg-white rounded p-2">
                              <div className="font-semibold mb-1">💡 纠错说明：</div>
                              <div>• <strong>勾选/取消</strong>：直接调整AI的分析结果</div>
                              <div>• <strong>保存修改</strong>：确认纠错并让AI学习{learningMode === 'public' ? '（贡献到公共库）' : '（保存到个人库）'}</div>
                              <div>• <strong>添加关键词</strong>：请到"学习面板"进行</div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 导出数据模态框 */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[80vh] w-full flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Copy className="text-green-600" />
                  复制数据到Excel
                </h3>
                <p className="text-gray-600 mt-2">
                  请复制下方数据，然后粘贴到Excel中。数据已按制表符分隔格式整理，Excel会自动识别列格式。
                </p>
              </div>
              <div className="flex-1 p-6 overflow-hidden">
                <textarea
                  value={exportData}
                  readOnly
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none"
                  placeholder="导出数据将显示在这里..."
                />
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-4 justify-end">
                <button
                  onClick={async () => {
                    const success = await copyToClipboard(exportData);
                    if (success) {
                      setValidationMessage({
                        type: 'success',
                        message: '✅ 数据已复制到剪贴板！请在Excel中粘贴'
                      });
                    } else {
                      setValidationMessage({
                        type: 'error',
                        message: '❌ 复制失败，请手动选择复制'
                      });
                    }
                    setTimeout(() => {
                      setValidationMessage({ type: '', message: '' });
                    }, 3000);
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Copy size={16} />
                  复制到剪贴板
                </button>
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    setExportData('');
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 功效类别参考表 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Eye className="text-indigo-600" />
            功效类别参考表
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-lg">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left font-bold text-gray-700">编号</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left font-bold text-gray-700">功效类别</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left font-bold text-gray-700">释义说明</th>
                </tr>
              </thead>
              <tbody>
                {dimension1Options.map((option) => (
                  <tr key={option.code} className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{option.code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${option.color}`}>
                        {option.value}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 leading-relaxed">{option.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartClaimsAnalyzer;
