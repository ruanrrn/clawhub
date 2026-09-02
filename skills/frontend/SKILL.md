---
name: frontend
description:
  前端开发专家技能，专注于现代Web应用开发。涵盖React/Vue/Angular等主流框架、
  TypeScript、CSS/Tailwind/Styled Components、性能优化、响应式设计、组件库开发、
  前端工程化（Webpack/Vite）、测试（Jest/Vitest/Playwright）及无障碍访问（a11y）。
  关键词：React, Vue, Angular, TypeScript, CSS, UI组件, 响应式, 前端性能,
  工程化, Vite, Webpack, npm, DOM, 浏览器API, SPA, PWA, 前端测试
---

# Frontend Development Skill

## 核心能力

### 1. 框架与库开发

- **React**: Hooks、Context、Redux/Zustand状态管理、Next.js SSR/SSG、并发特性
- **Vue**: Composition API、Pinia、Nuxt.js、性能优化
- **Angular**: RxJS、依赖注入、变更检测优化、NgRx
- **跨框架**: 微前端架构（Module Federation、qiankun）、Web Components

### 2. 类型系统与语言

- **TypeScript**: 泛型、类型守卫、条件类型、映射类型、严格模式配置
- **现代JavaScript**: ES2023+特性、异步编程、模块化、Proxy/Reflect
- **类型安全**: Zod/Yup运行时验证、Prisma/GraphQL类型生成

### 3. 样式与UI工程

- **CSS架构**: BEM、SMACSS、CSS-in-JS、CSS Modules、原子化CSS（Tailwind/UnoCSS）
- **设计系统**: 组件库开发（Storybook）、设计令牌（Design Tokens）、主题切换
- **响应式**: 移动优先、Container Queries、CSS Grid/Flexbox复杂布局
- **视觉效果**: CSS动画、Canvas/SVG、WebGL（Three.js基础）、滚动驱动动画

### 4. 性能与优化

- **加载性能**: 代码分割、懒加载、预加载策略、资源优先级、Tree Shaking
- **运行时性能**: 虚拟列表、防抖节流、Web Workers、内存泄漏排查
- **Core Web Vitals**: LCP、FID/INP、CLS优化策略、性能预算
- **缓存策略**: Service Worker、HTTP缓存、本地存储优化

### 5. 工程化与工具链

- **构建工具**: Vite（推荐）、Webpack、Rollup、esbuild、SWC、Parcel
- **包管理**: pnpm workspace、monorepo架构（Turborepo/Nx）、依赖分析
- **代码质量**: ESLint/Prettier配置、Husky/lint-staged、Commitizen
- **CI/CD**: GitHub Actions、Docker化部署、CDN配置、边缘计算（Vercel/Cloudflare）

### 6. 测试与质量保障

- **单元测试**: Jest/Vitest、React Testing Library、Vue Test Utils、覆盖率阈值
- **E2E测试**: Playwright（推荐）、Cypress、视觉回归测试（Percy/Chromatic）
- **类型测试**: tsd、类型级单元测试
- **可访问性**: axe-core、键盘导航、屏幕阅读器测试、WCAG 2.1 AA合规

### 7. 浏览器与网络

- **API应用**: Fetch/Axios高级封装、WebSocket、SSE、WebRTC基础
- **存储方案**: IndexedDB、OPFS、缓存策略对比
- **安全**: CSP、XSS/CSRF防护、HTTPS最佳实践、敏感数据处理
- **PWA**: Manifest、Service Worker生命周期、后台同步、推送通知

## 决策指南

当用户请求涉及以下场景时激活此技能：

1. **组件开发**: 设计可复用、可访问的UI组件
2. **状态管理**: 选择合适的状态方案（本地、全局、服务端状态）
3. **性能问题**: 页面卡顿、加载慢、内存泄漏诊断
4. **架构设计**: 大型前端应用结构、微前端拆分策略
5. **工程配置**: 构建优化、开发体验提升、部署流程
6. **技术选型**: 框架对比、库选择、迁移方案（如Vue2→3）
7. **调试排错**: 浏览器DevTools高级用法、网络问题分析

## 操作指令

### 代码生成规范

- 默认使用 **TypeScript** + 严格模式
- 组件采用函数式编程，优先使用Hooks/Composition API
- 样式方案根据上下文选择：Tailwind（快速开发）、CSS Modules（作用域隔离）、Styled Components（动态样式）
- 必须包含基础的可访问性属性（aria-label、role、键盘事件）
- 复杂逻辑需附带注释说明设计决策

### 项目初始化

```bash
# 推荐现代技术栈（2024）
npm create vite@latest my-app -- --template react-ts
# 或
npm create vue@latest my-app
# 或
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir
```
