# 2026 上证杯 ETF 刷题

一个面向手机的纯静态刷题网站，部署在 GitHub Pages 上。题库共 847 题。

## 功能
- 顺序练习：自动记住做到哪一题
- 随机练习：打乱一次后记住顺序和进度
- 错题本：答错自动加入，在错题本里答对一次就移出
- 收藏、关键字搜索（结果里直接显示答案）
- 答题卡跳题，左右滑动切题
- 可以离线使用，能添加到手机主屏幕（PWA）
- 进度只保存在本机浏览器（localStorage）

## 本地预览
```bash
cd docs && python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 更新题库
```bash
python3 tools/build_questions.py   # 读取 etf2026_questions.json，生成 docs/questions.json
```
然后把 `docs/sw.js` 里的 `VERSION` 加 1，再提交。

## 部署
1. 把仓库推送到 GitHub
2. 打开仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支选 `main`，目录选 `/docs`
3. 访问 `https://<用户名>.github.io/<仓库名>/`
