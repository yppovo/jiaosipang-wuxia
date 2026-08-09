# 角丝旁行侠记

一部**古代武侠画风**的简易横版小游戏。

主角 **角丝旁**，是一名戴草帽的女剑修。行走江湖，最见不得欺压良善之事——路见不平，拔刀相助。

## 🌐 在线游玩

已部署到 GitHub Pages，点击即可在线游玩（手机/电脑均可）：

**https://yppovo.github.io/jiaosipang-wuxia/**

## 玩法

- **← → / A D**：左右移动
- **空格 / J / 点击**：挥剑
- **手机**：屏幕左下 ◀ ▶ 移动，右下「拔剑」攻击

击败三波强敌：古道山贼 → 恶霸众贼 → 黑风寨主。

## 打开方式

- 直接双击 `index.html`（Chrome / Edge 最佳）
- 或 `python -m http.server` 后访问

## 文件结构

```
wuxia/
├── index.html      # 标题画面
├── game.html       # 游戏主场景
├── css/style.css
├── js/sprite.js    # 角色立绘（角丝旁 / 山贼 / 山寨主）
├── js/game.js      # 战斗引擎
├── js/audio.js     # WebAudio 音效
└── assets/favicon.svg
```

立绘与场景均为手绘 SVG，音效由 WebAudio 实时合成，全程离线可用。

