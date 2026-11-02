# 朱明强 · Mingqiang Zhu

个人网站：<https://m-qiangzhu.github.io/>

- 主页：紧凑的双语履历排版，支持浅深主题。
- [简历导出](https://m-qiangzhu.github.io/cv.html)：切换中英文，选择章节及项目，通过浏览器“另存为 PDF”导出 A4 简历。建议在打印设置中关闭页眉和页脚。
- [表单编辑器](https://m-qiangzhu.github.io/edit.html)：编辑双语资料、工作、技能、项目、论文、专利申请和认证；自动保存浏览器草稿，连接 GitHub 后直接保存并发布，支持预览及 JSON 备份与导入。

## 更新公开网站

1. 首次使用，在编辑器的“首次使用”说明中打开 GitHub 令牌设置。使用 `M-qiangZhu` 账号创建 fine-grained personal access token，仅选择 `M-qiangZhu.github.io` 仓库，授予 **Contents → Read and write**；其他权限无需添加，建议设置较短有效期。
2. 将生成的 `github_pat_…` 填入编辑器并连接。不要使用 GitHub 密码，不要在聊天中发送令牌。
3. 修改资料并预览，点击 **保存并发布**。编辑器会直接提交 `main/content.js`，触发原有的 Pages 自动部署。
4. 页面先显示“已保存到 GitHub”，再检查公开网站资料是否匹配本次提交，确认后显示“已上线”。通常需要等待片刻；自动检查约五分钟后停止，可手动重新检查或查看部署记录。

令牌只在当前标签页内存中使用，连接后立即清空输入框；不会写入仓库、草稿、localStorage 或 sessionStorage。刷新、关闭、离开编辑器后需重新连接。可在 GitHub 令牌设置中随时撤销或更换令牌。仅使用 fine-grained token；不要使用权限范围更广的 classic token。

编辑器会先读取远端最新资料，并在提交时核对文件 SHA。发现远端更新时会暂停发布，允许选择载入远端，或明确确认保留本地整份草稿替换远端；不会自动合并资料。请求超时可能发生在 GitHub 已接收提交之后，重试会先比较内容，相同资料不会重复提交。保存请求期间继续编辑的内容仍保留为未发布草稿。

在线发布上限为 1 MB（UTF-8 字节），确保提交后仍能通过 GitHub Contents API 读取与继续编辑。

网络或授权不便时，仍可使用底部的备用手动发布入口，下载 `content.js` 上传到仓库，或写回本地目录。

草稿只保存在当前浏览器；普通主页和简历不会读取草稿。带 `?preview=1` 的预览页面才读取本地草稿，并显示“尚未发布”提示。本地保存不代表远端发布。主页和简历打开时会额外读取最新公开资料以减少缓存影响，离线时回退到已加载的资料。

## 资料与排序

`content.js` 是主页、简历、编辑器共同使用的资料。

- 日期支持 `YYYY`、`YYYY-MM`、`YYYY-MM-DD`。持续中使用 `present`；未知日期留空，不补造月份。
- 项目和工作按结束日期、再按开始日期倒序，持续中优先，无日期排后，同日期保持原顺序。
- 论文按正式出版日期 `published` 倒序，`online` 仅记录在线发表时间。
- 作者以原文顺序保存；`self` 标识本人，`coFirst` 与 `corresponding` 独立记录。共一标记 †，通讯标记 *，均附说明。第二位共同第一作者不会被误判为普通第二作者。
- `cvSelected` 控制默认精选项目，导出界面仍可自行选择。
- 导入仅接受严格 JSON 或本站导出的 `window.PORTFOLIO = {...};` 文件，不执行输入脚本。

## 文件与开发

- `portfolio-core.js`：日期、排序、作者贡献、导入与校验。
- `portfolio-view.js`：主页和简历共用的内容渲染。
- `index.html` / `app.js` / `styles.css`：主页。
- `cv.html` / `cv.js`：简历选择与打印。
- `edit.html` / `editor.js` / `editor.css`：资料表单与本地草稿。
- `github-publish.js`：固定仓库的 GitHub API 客户端、SHA 冲突保护、实际上线内容校验。
- `editor-publish.js`：连接、发布、冲突选择和上线状态界面。

本地预览：`python3 -m http.server 4173`。

测试：`node --test tests/*.test.cjs`。

GitHub Pages 从 `main` 分支根目录自动发布；无需安装前端依赖。
