# 朱明强 · Mingqiang Zhu

个人网站：<https://m-qiangzhu.github.io/>

- 主页：紧凑的双语履历排版，支持浅深主题。
- [简历导出](https://m-qiangzhu.github.io/cv.html)：切换中英文，选择章节及项目，通过浏览器“另存为 PDF”导出 A4 简历。建议在打印设置中关闭页眉和页脚。
- [表单编辑器](https://m-qiangzhu.github.io/edit.html)：编辑双语资料、工作、技能、项目、论文、专利申请和认证；自动保存浏览器草稿，支持预览、JSON 备份与导入、content.js 导出及支持浏览器中的本地目录写回。

## 更新公开网站

1. 在编辑器中修改资料并预览。
2. 点击“下载发布文件”，获得 `content.js`。
3. 使用编辑器底部的 GitHub 上传入口，将文件上传到此仓库 `main` 分支并提交。
4. 等待 Pages 部署完成。

草稿只保存在当前浏览器；普通主页和简历不会读取草稿。带 `?preview=1` 的预览页面才读取本地草稿，并显示“尚未发布”提示。编辑器没有远程账户、翻译接口或 GitHub 令牌存储；本地保存不代表远端发布。

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

本地预览：`python3 -m http.server 4173`。

测试：`node --test tests/core.test.cjs`。

GitHub Pages 从 `main` 分支根目录自动发布；无需安装前端依赖。
