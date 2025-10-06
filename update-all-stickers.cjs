const fs = require('fs');
const path = require('path');

// Read the current JSON file
const jsonPath = path.join(__dirname, 'client/src/data/animatedEmojis.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Create combined stickers array
const allStickers = [];

// First, add the old stickers
const oldStickers = [
  {id: "custom_20", name: "ملصق قديم 1", url: "/assets/emojis/custom/emoji_20.jpg", code: ":old20:"},
  {id: "custom_25", name: "ملصق قديم 2", url: "/assets/emojis/custom/emoji_25.png", code: ":old25:"},
  {id: "custom_29", name: "ملصق قديم 3", url: "/assets/emojis/custom/emoji_29.png", code: ":old29:"},
  {id: "custom_30", name: "ملصق قديم 4", url: "/assets/emojis/custom/emoji_30.png", code: ":old30:"},
  {id: "custom_31", name: "ملصق قديم 5", url: "/assets/emojis/custom/emoji_31.png", code: ":old31:"},
  {id: "custom_32", name: "ملصق قديم 6", url: "/assets/emojis/custom/emoji_32.png", code: ":old32:"},
  {id: "custom_33", name: "ملصق قديم 7", url: "/assets/emojis/custom/emoji_33.png", code: ":old33:"},
  {id: "custom_34", name: "ملصق قديم 8", url: "/assets/emojis/custom/emoji_34.png", code: ":old34:"},
  {id: "custom_35", name: "ملصق قديم 9", url: "/assets/emojis/custom/emoji_35.png", code: ":old35:"},
  {id: "custom_36", name: "ملصق قديم 10", url: "/assets/emojis/custom/emoji_36.png", code: ":old36:"},
  {id: "custom_37", name: "ملصق قديم 11", url: "/assets/emojis/custom/emoji_37.png", code: ":old37:"},
  {id: "custom_38", name: "ملصق قديم 12", url: "/assets/emojis/custom/emoji_38.png", code: ":old38:"},
  {id: "custom_39", name: "ملصق قديم 13", url: "/assets/emojis/custom/emoji_39.png", code: ":old39:"},
  {id: "custom_43", name: "ملصق قديم 14", url: "/assets/emojis/custom/emoji_43.png", code: ":old43:"},
  {id: "custom_45", name: "ملصق قديم 15", url: "/assets/emojis/custom/emoji_45.png", code: ":old45:"},
  {id: "custom_46", name: "ملصق قديم 16", url: "/assets/emojis/custom/emoji_46.png", code: ":old46:"},
  {id: "custom_47", name: "ملصق قديم 17", url: "/assets/emojis/custom/emoji_47.png", code: ":old47:"},
  {id: "custom_48", name: "ملصق قديم 18", url: "/assets/emojis/custom/emoji_48.png", code: ":old48:"},
  {id: "custom_49", name: "ملصق قديم 19", url: "/assets/emojis/custom/emoji_49.png", code: ":old49:"},
  {id: "custom_50", name: "ملصق قديم 20", url: "/assets/emojis/custom/emoji_50.png", code: ":old50:"},
  {id: "custom_56", name: "ملصق قديم 21", url: "/assets/emojis/custom/emoji_56.png", code: ":old56:"},
  {id: "custom_57", name: "ملصق قديم 22", url: "/assets/emojis/custom/emoji_57.png", code: ":old57:"},
  {id: "custom_59", name: "ملصق قديم 23", url: "/assets/emojis/custom/emoji_59.png", code: ":old59:"},
  {id: "custom_61", name: "ملصق قديم 24", url: "/assets/emojis/custom/emoji_61.png", code: ":old61:"},
  {id: "custom_62", name: "ملصق قديم 25", url: "/assets/emojis/custom/emoji_62.png", code: ":old62:"},
  {id: "custom_63", name: "ملصق قديم 26", url: "/assets/emojis/custom/emoji_63.png", code: ":old63:"},
  {id: "custom_65", name: "ملصق قديم 27", url: "/assets/emojis/custom/emoji_65.png", code: ":old65:"},
  {id: "custom_70", name: "ملصق قديم 28", url: "/assets/emojis/custom/emoji_70.png", code: ":old70:"}
];

// Add old stickers
allStickers.push(...oldStickers);

// Then add new stickers
for (let i = 1; i <= 62; i++) {
  allStickers.push({
    id: `sticker_${i}`,
    name: `ملصق جديد ${i}`,
    url: `/assets/emojis/custom/sticker_${i}.png`,
    code: `:s${i}:`
  });
}

// Update the stickers category
data.categories.stickers.emojis = allStickers;

// Write the updated JSON back
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

console.log(`تم تحديث ملف JSON بـ ${allStickers.length} ملصق (28 قديم + 62 جديد)!`);