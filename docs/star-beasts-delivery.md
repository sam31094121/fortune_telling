# 二十八星宿神獸交付手冊

## 交付內容與使用規則

- 覺醒體正式圖片位於 `public/star-beasts/`，共 28 張，每季 7 張。
- 春季另已完成 7 張「星宿幼體」卡；它們與覺醒體為同一隻神獸的不同成長階段，不是一般動物版本。
- 每張皆為唯一正式版本：PNG、直式、`950 × 1656 px`。不得改用舊版或自行重新命名。
- 網站請引用下表的 `/star-beasts/...` 路徑；前端以 CSS 等比例縮放，不裁切、不拉伸。
- 所有結構化資料均在 `data/star-beasts.json`，可直接供前端建立列表、詳細頁或篩選功能。
- 覺醒體檔名規則：`{兩位數編號}-{拼音}.png`；幼體檔名規則：`{兩位數編號}-{拼音}-young-divine.png`。季節由資料夾表示，故檔名不重複寫季節。

## 路徑說明

| 路徑 | 用途 |
|---|---|
| `public/star-beasts/spring/` | 東方蒼龍七宿，春季正式圖片（01–07） |
| `public/star-beasts/summer/` | 南方朱雀七宿，夏季正式圖片（22–28） |
| `public/star-beasts/autumn/` | 西方白虎七宿，秋季正式圖片（15–21） |
| `public/star-beasts/winter/` | 北方玄武七宿，冬季正式圖片（08–14） |
| `data/star-beasts.json` | 供工程師／程式讀取的完整資料與圖片路徑 |
| `docs/star-beasts-delivery.md` | 本交付手冊 |

## 成長階段資料規則

- `image`：既有的「覺醒體」神獸卡。
- `youngDivineImage`：同一神獸的「星宿幼體」卡。已完成的春季 01–07 均有此欄位；其他季節會在幼體卡完成後補上。
- 前端若只需原有 28 張卡，維持讀取 `image` 即可；需要進化展示時，先顯示 `youngDivineImage`，再切換至 `image`。

## 春季幼體卡｜已完成

| 編號 | 星宿 | 幼體圖片路徑 | 對應覺醒體 |
|---:|---|---|---|
| 01 | 角木蛟 | `/star-beasts/spring/01-jiao-mu-jiao-young-divine.png` | `/star-beasts/spring/01-jiao-mu-jiao.png` |
| 02 | 亢金龍 | `/star-beasts/spring/02-kang-jin-long-young-divine.png` | `/star-beasts/spring/02-kang-jin-long.png` |
| 03 | 氐土貉 | `/star-beasts/spring/03-di-tu-he-young-divine.png` | `/star-beasts/spring/03-di-tu-he.png` |
| 04 | 房日兔 | `/star-beasts/spring/04-fang-ri-tu-young-divine.png` | `/star-beasts/spring/04-fang-ri-tu.png` |
| 05 | 心月狐 | `/star-beasts/spring/05-xin-yue-hu-young-divine.png` | `/star-beasts/spring/05-xin-yue-hu.png` |
| 06 | 尾火虎 | `/star-beasts/spring/06-wei-huo-hu-young-divine.png` | `/star-beasts/spring/06-wei-huo-hu.png` |
| 07 | 箕水豹 | `/star-beasts/spring/07-ji-shui-bao-young-divine.png` | `/star-beasts/spring/07-ji-shui-bao.png` |

## 東方蒼龍七宿｜春季

| 編號 | 星宿／動物 | 象徵部位 | 核心意義 | 性格與命運特質 | 圖片路徑 |
|---:|---|---|---|---|---|
| 01 | 角木蛟／蛟 | 蒼龍之角 | 突破開創 | 具領導才能，直覺敏銳，善破僵局；性格過於剛烈，不易妥協。 | `/star-beasts/spring/01-jiao-mu-jiao.png` |
| 02 | 亢金龍／龍 | 蒼龍咽喉 | 正直威權 | 風骨高尚，嫉惡如仇，重視名譽；性格倔強，不願流於俗套。 | `/star-beasts/spring/02-kang-jin-long.png` |
| 03 | 氐土貉／貉 | 蒼龍胸肋 | 承載基石 | 性格低調沉穩，適應力極強，善默默耕耘；屬於大器晚成型。 | `/star-beasts/spring/03-di-tu-he.png` |
| 04 | 房日兔／兔 | 蒼龍腹部 | 明朗財祿 | 人緣極佳，開朗樂觀，具商業頭腦；多得貴人相助，常有意外財。 | `/star-beasts/spring/04-fang-ri-tu.png` |
| 05 | 心月狐／狐 | 蒼龍心臟 | 權謀多疑 | 心思極其細密，洞察力驚人，具神秘魅力；內心佔有慾強。 | `/star-beasts/spring/05-xin-yue-hu.png` |
| 06 | 尾火虎／虎 | 蒼龍之尾 | 爭鬥好勝 | 戰鬥力旺盛，不服輸，喜好競爭；逆境中爆發力強，需防暴躁。 | `/star-beasts/spring/06-wei-huo-hu.png` |
| 07 | 箕水豹／豹 | 蒼龍尾末 | 風浪漂泊 | 熱愛自由，特立獨行，口才極佳；一生多奔波，適合創意傳播。 | `/star-beasts/spring/07-ji-shui-bao.png` |

## 北方玄武七宿｜冬季

| 編號 | 星宿／動物 | 象徵部位 | 核心意義 | 性格與命運特質 | 圖片路徑 |
|---:|---|---|---|---|---|
| 08 | 斗木獬／獬 | 玄武之首 | 才華穩健 | 性格溫和敦厚，好學深思，具文人氣質；處事按部就班，受人信賴。 | `/star-beasts/winter/08-dou-mu-xie.png` |
| 09 | 牛金牛／牛 | 玄武脖頸 | 勞碌基業 | 刻苦耐勞，責任感極強，極其固執；一生較為操勞，但能積攢家業。 | `/star-beasts/winter/09-niu-jin-niu.png` |
| 10 | 女土蝠／蝠 | 玄武身軀 | 技能內斂 | 專注力強，擁有一技之長；性格偏向保守內向，不喜與人爭鋒。 | `/star-beasts/winter/10-nu-tu-fu.png` |
| 11 | 虛日鼠／鼠 | 玄武虛位 | 空虛靈性 | 直覺力強，思想深邃，對神秘事物感興趣；內心常感孤獨、缺乏安全感。 | `/star-beasts/winter/11-xu-ri-shu.png` |
| 12 | 危月燕／燕 | 玄武屋脊 | 高危機警 | 危機意識極高，做事謹慎，性格剛直；一生多大風大浪，靠機智化險。 | `/star-beasts/winter/12-wei-yue-yan.png` |
| 13 | 室火豬／豬 | 玄武宮室 | 建設剛猛 | 行動力驚人，性格豪爽直率，具開拓精神；適合建築、創業、軍警。 | `/star-beasts/winter/13-shi-huo-zhu.png` |
| 14 | 壁水貐／貐 | 玄武牆壁 | 守護智慧 | 喜好鑽研學問，性格沉靜，不喜衝突；扮演守護者或幕僚能大放異彩。 | `/star-beasts/winter/14-bi-shui-yu.png` |

## 西方白虎七宿｜秋季

| 編號 | 星宿／動物 | 象徵部位 | 核心意義 | 性格與命運特質 | 圖片路徑 |
|---:|---|---|---|---|---|
| 15 | 奎木狼／狼 | 白虎之尾 | 文采反差 | 外表威嚴，內在卻極具文才與浪漫；聰明好學，但感情較多波折。 | `/star-beasts/autumn/15-kui-mu-lang.png` |
| 16 | 婁金狗／狗 | 白虎聚眾 | 繁衍利索 | 做事乾脆利落，善於理財，家庭觀念重；具服務精神，常為人解難。 | `/star-beasts/autumn/16-lou-jin-gou.png` |
| 17 | 胃土雉／雉 | 白虎之胃 | 財庫剛強 | 性格強勢，好勝心重，對金錢極其敏銳；具備天生的經商與管理長才。 | `/star-beasts/autumn/17-wei-tu-zhi.png` |
| 18 | 昴日雞／雞 | 白虎耳目 | 名聲清高 | 外貌出眾，氣質清高，自尊心極強；重視精神層面，容易獲得名望。 | `/star-beasts/autumn/18-mao-ri-ji.png` |
| 19 | 畢月烏／烏鴉 | 白虎邊疆 | 堅韌守衛 | 意志力驚人，性格剛毅，能吃苦耐勞；適合在逆境與高難度環境生存。 | `/star-beasts/autumn/19-bi-yue-wu.png` |
| 20 | 觜火猴／猴 | 白虎之口 | 口舌機變 | 言辭犀利，思維敏捷，善於辯論；臨場反應極強，但要防口舌是非。 | `/star-beasts/autumn/20-zi-huo-hou.png` |
| 21 | 參水猿／無尾猿 | 白虎將軍 | 變革煞氣 | 性格剛烈，不畏權勢，好勇鬥狠；一生多重大變革，具大開大合之命。 | `/star-beasts/autumn/21-shen-shui-yuan.png` |

## 南方朱雀七宿｜夏季

| 編號 | 星宿／動物 | 象徵部位 | 核心意義 | 性格與命運特質 | 圖片路徑 |
|---:|---|---|---|---|---|
| 22 | 井木犴／犴 | 朱雀之冠 | 敏銳陰鬱 | 直覺驚人，體質敏感，常察覺他人不見的細節；性格溫和但內心悲觀。 | `/star-beasts/summer/22-jing-mu-an.png` |
| 23 | 鬼金羊／羊 | 朱雀之眼 | 神秘庇護 | 靈性極高，善解人意，常得神明或長輩庇佑；對玄學、心理學有天賦。 | `/star-beasts/summer/23-gui-jin-yang.png` |
| 24 | 柳土獐／獐 | 朱雀之嘴 | 柔順多疑 | 外表溫和，擅長社交；內心多疑、善變，容易在感情或決策中搖擺。 | `/star-beasts/summer/24-liu-tu-zhang.png` |
| 25 | 星日馬／馬 | 朱雀頸部 | 奔波忠烈 | 熱愛奔波，生命力旺盛，重視榮譽；一生多在外地發展，有大將之風。 | `/star-beasts/summer/25-xing-ri-ma.png` |
| 26 | 張月鹿／鹿 | 朱雀羽翼 | 華麗受矚 | 愛漂亮，喜歡成為全場焦點，表演慾強；具備極佳的公關與演藝天賦。 | `/star-beasts/summer/26-zhang-yue-lu.png` |
| 27 | 翼火蛇／蛇 | 朱雀翅膀 | 輔助飛翔 | 擅長輔佐領導者，心思慎密，行動快如閃電；是不可或缺的靈魂幕僚。 | `/star-beasts/summer/27-yi-huo-she.png` |
| 28 | 軫水蚓／蚓 | 朱雀尾端 | 車輿協調 | 擅長協調各方利益，處事圓融；一生與車船、貿易有緣，平穩向成功。 | `/star-beasts/summer/28-zhen-shui-yin.png` |
