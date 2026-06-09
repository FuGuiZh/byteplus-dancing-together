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

## Docker 运行

项目已经开启 Next.js `standalone` 输出，可以直接用 Docker 构建生产镜像：

```bash
docker build -t byteplus-dancing-together .
docker run --rm -p 3000:3000 --env-file .env.local \
  -e BYTEPLUS_DANCING_TOGETHER_DATA_DIR=/data/byteplus-dancing-together \
  -v byteplus-dancing-together-data:/data \
  byteplus-dancing-together
```

容器内会话文件和生成内容资产默认写入 `/data/byteplus-dancing-together`。不在容器里运行时，`BYTEPLUS_DANCING_TOGETHER_DATA_DIR` 可以不填：

- Windows：`%APPDATA%\BytePlus Dancing Together`
- macOS：`~/Library/Application Support/BytePlus Dancing Together`
- Linux：`$XDG_DATA_HOME/byteplus-dancing-together` 或 `~/.local/share/byteplus-dancing-together`

## Render 部署

仓库根目录提供了 `render.yaml` 和 `Dockerfile`，Render 会用 Docker runtime 构建镜像，并把持久盘挂载到 `/data`。Render 官方说明里 Docker 服务可通过 `runtime: docker`、`dockerfilePath`、`dockerContext` 指定构建方式，持久盘只有写入 mount path 下的数据会跨部署保留。

参考：

- [Render Blueprint Spec](https://render.com/docs/blueprint-spec)
- [Render Persistent Disks](https://render.com/docs/disks)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)

在 Render Blueprint 创建时，需要填写这些 `sync: false` 环境变量：

- `APP_PUBLIC_URL`：部署后的公网地址，例如 `https://你的服务.onrender.com`
- `BYTEPLUS_REAL_PERSON_CALLBACK_URL`：例如 `https://你的服务.onrender.com/api/byteplus/real-person-callback`
- `BYTEPLUS_VIDEO_TASK_CALLBACK_URL`：例如 `https://你的服务.onrender.com/api/byteplus/video-task-callback`
- `BYTEPLUS_IAM_ACCESS_KEY_ID`
- `BYTEPLUS_IAM_SECRET_ACCESS_KEY`
- `BYTEPLUS_MODELARK_API_KEY`
- `BYTEPLUS_SEEDANCE_2_ENDPOINT_ID`
- `BYTEPLUS_SEEDANCE_2_FAST_ENDPOINT_ID`

健康检查地址是 `/api/health`。生成视频归档依赖持久盘；如果不挂载 `/data`，Render 容器重启或重新部署后本地保存的视频文件会丢失。

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
