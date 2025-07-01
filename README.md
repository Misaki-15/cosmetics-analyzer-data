# 智能化妆品宣称分析器 v2.4

> 🧠 AI驱动的智能化妆品宣称分析工具，支持多维度分析、品类筛选、云端存储和自主学习优化

## ✨ 主要特性

- 🧠 **AI自我学习优化** - 通过用户纠错不断提升分析准确性
- 💡 **多功效智能识别** - 支持27种化妆品功效的智能识别
- 🏷️ **品类智能筛选** - 根据产品类型智能筛选适用功效
- ☁️ **GitHub云端存储** - 学习数据自动同步到GitHub，永久保存
- 📊 **Excel/CSV导出** - 支持分析结果导出为Excel或CSV格式
- 🔧 **两步分析法** - 基础库+学习库双重保障，确保稳定性

## 🚀 快速开始

### 本地运行

```bash
# 克隆项目
git clone https://github.com/your-username/cosmetics-analyzer-v2.4.git
cd cosmetics-analyzer-v2.4

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 环境变量配置（可选）

创建 `.env.local` 文件启用GitHub云存储：

```bash
REACT_APP_GITHUB_OWNER=your-github-username
REACT_APP_GITHUB_REPO=cosmetics-analyzer-data
REACT_APP_GITHUB_TOKEN=ghp_your_token_here
```

## 📖 使用指南

### 基础分析
1. 选择产品品类（可选，提升准确性）
2. 输入化妆品宣称内容，每行一个
3. 点击"智能分析"按钮
4. 查看三维度分析结果：
   - **维度一**：功效类别（保湿、美白、抗皱等）
   - **维度二**：宣称类型（原料功效、使用感受等）
   - **维度三**：持续性（即时、持久）

### AI学习优化
- 点击"纠错"按钮修正错误分析
- 使用"学习面板"手动添加新关键词
- AI会根据反馈自动优化分析模型

## 🏗️ 技术架构

- **React 18** + **Tailwind CSS** + **Lucide React**
- **两步分析法**：基础关键词库 + AI学习库
- **存储方式**：内存存储 + GitHub云端存储（可选）
- **导出格式**：Excel/CSV双格式支持

## 🚀 部署选项

### Vercel部署（推荐）
```bash
npm i -g vercel
vercel
```

### 其他选项
- **Netlify**: 拖拽部署
- **GitHub Pages**: 静态托管
- **自建服务器**: Docker部署

详细部署指南请参考：[完整部署指南](DEPLOYMENT.md)

## 🤝 贡献

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交Pull Request

## 📝 许可证

本项目采用 [MIT 许可证](LICENSE)

---

**Made with ❤️ by [Misaki-15](https://github.com/Misaki-15)**