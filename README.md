# byteplus-dancing-together

BytePlus Dancing Together 是一个围绕真人素材授权、私域素材审核和 Seedance 2.0 视频生成链路设计的产品工作台。

它的目标是让产品和研发在同一个界面里确认用户体验、接口状态、关键字段和异常兜底。已经接入真实 BytePlus API 的链路会直接请求上游；凭证缺失或接口暂未接入时，后端返回本地 fallback 数据用于保持界面可演示。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui 风格组件
- lucide-react 图标
- zod 请求、环境变量和运行配置校验

## 本地运行

```bash
pnpm install
pnpm dev
```

环境变量模板在 `.env.example`。本地实际配置使用 `.env.local`，该文件不会提交到 Git。

非敏感的产品默认值、轮询设置、上游地址和调试开关在 `config/byteplus-dancing-together.json` 中维护。个人本地覆盖可以创建 `config/byteplus-dancing-together.local.json`，该文件不会提交到 Git。

没有补齐真实凭证时，相关接口会返回本地 fallback 数据；补齐 `.env.local` 后，对应已接入接口会进入真实 BytePlus API 链路。

接入真实 BytePlus API 时，需要在 `.env.local` 补齐：

- `BYTEPLUS_IAM_ACCESS_KEY_ID`
- `BYTEPLUS_IAM_SECRET_ACCESS_KEY`
- `BYTEPLUS_MODELARK_API_KEY`
- `BYTEPLUS_SEEDANCE_2_ENDPOINT_ID`
- `BYTEPLUS_SEEDANCE_2_FAST_ENDPOINT_ID`

## 项目结构

- `app/`：页面和 Next.js route handlers。
- `components/`：产品工作台与基础 UI 组件。
- `config/`：非敏感运行配置。
- `lib/app-config.ts`：JSON 运行配置读取与校验。
- `lib/byteplus-config.ts`：BytePlus 环境变量、运行配置、endpoint 选择和真实 API 可用性判断。
- `lib/byteplus-contracts.ts`：工作台 API 请求结构。
- `lib/byteplus-local-fallback.ts`：凭证缺失或接口暂未接入时的本地 fallback 响应。
- `lib/studio-fixtures.ts`：工作台初始素材和状态样例。
- `docs/`：Seedance 2.0 真人素材产品体验与 API 接入文档。
- `DESIGN.md`：产品视觉和交互设计约束。

## 文档

- [Seedance 2.0 真人素材产品体验与架构设计](docs/seedance-2-real-human-experience-architecture.md)
- [Seedance 2.0 真人与私域素材 API 接入通路](docs/seedance-2-real-human-api-integration.md)
