/**
 * ?剜?謓菟?AI ?剔捂赯?????蝯?- ?鞊???
 * ??????謕?????蝞???塗?萄????皝??嚗??謆?
 */

export interface MusicGenreProfile {
  era: string;
  bpmMin: number;
  bpmMax: number;
  instruments: string[];
  moodKeywords: string[];
  instrumentTimbre: string;
}

// ?葛隤??????冽??葛隤???????詨赯??塗??
// ?鞊?????城???畸足?蟡??嚚???BPM?蹓賣????????殷??1950s-2020s??
export const EraDatabase: Record<string, MusicGenreProfile> = {
  "1950s": {
    era: "1950s",
    bpmMin: 80,
    bpmMax: 115,
    instruments: ["piano", "string_quartet", "brass", "acoustic_bass", "acoustic_guitar"],
    moodKeywords: ["vintage", "nostalgic", "pure", "romantic", "innocent"],
    instrumentTimbre: "warm, resonant, organic, live",
  },
  "1960s": {
    era: "1960s",
    bpmMin: 95,
    bpmMax: 135,
    instruments: ["electric_guitar", "drum_kit", "bass", "piano", "organ"],
    moodKeywords: ["rebellious", "free-spirited", "idealistic", "joyful", "groovy"],
    instrumentTimbre: "raw, electric, warm, analog",
  },
  "1970s": {
    era: "1970s",
    bpmMin: 88,
    bpmMax: 130,
    instruments: ["electric_guitar", "synthesizer", "drums", "bass", "strings"],
    moodKeywords: ["psychedelic", "groovy", "soulful", "experimental", "cinematic"],
    instrumentTimbre: "rich, analog, layered, soulful",
  },
  "1980s": {
    era: "1980s",
    bpmMin: 100,
    bpmMax: 145,
    instruments: ["synth_lead", "drum_machine", "electric_bass", "power_guitar", "vocoder"],
    moodKeywords: ["energetic", "dramatic", "synth-driven", "bold", "neon"],
    instrumentTimbre: "bright, punchy, electronic, synthetic",
  },
  "1990s": {
    era: "1990s",
    bpmMin: 85,
    bpmMax: 140,
    instruments: ["distorted_guitar", "drum_machine", "synth", "bass", "turntable"],
    moodKeywords: ["alternative", "introspective", "raw", "emotional", "rebellious"],
    instrumentTimbre: "gritty, digital, dynamic, layered",
  },
  "2000s": {
    era: "2000s",
    bpmMin: 90,
    bpmMax: 145,
    instruments: ["synth", "electric_drums", "bass", "guitar", "auto_tune"],
    moodKeywords: ["uplifting", "polished", "catchy", "electronic", "anthemic"],
    instrumentTimbre: "crisp, modern, layered, produced",
  },
  "2010s": {
    era: "2010s",
    bpmMin: 85,
    bpmMax: 128,
    instruments: ["synth_pad", "trap_drums", "bass", "vocal_chops", "acoustic_guitar"],
    moodKeywords: ["nostalgic", "lo-fi", "authentic", "introspective", "cinematic"],
    instrumentTimbre: "warm-digital, indie, textured, emotionally rich",
  },
  "2020s": {
    era: "2020s",
    bpmMin: 70,
    bpmMax: 150,
    instruments: ["synth", "808_drums", "bass", "vocal_chops", "ambient_pad", "granular"],
    moodKeywords: ["ambient", "atmospheric", "introspective", "minimalist", "hypnotic"],
    instrumentTimbre: "sparse, cinematic, immersive, spatial",
  },
};

// ?賹慫?剔捂赯菟????冽??賹慫 ???剔捂赯??塗??
export const ZodiacPersonalityMap: Record<string, Record<string, number>> = {
  "Aries": { emotion: 70, logic: 65, social: 85, leadership: 90, security: 55, creativity: 75, risk: 85, attachment: 60 },
  "Taurus": { emotion: 60, logic: 75, social: 65, leadership: 60, security: 95, creativity: 70, risk: 40, attachment: 85 },
  "Gemini": { emotion: 65, logic: 80, social: 90, leadership: 70, security: 50, creativity: 85, risk: 75, attachment: 55 },
  "Cancer": { emotion: 90, logic: 60, social: 70, leadership: 60, security: 80, creativity: 75, risk: 45, attachment: 95 },
  "Leo": { emotion: 75, logic: 70, social: 85, leadership: 95, security: 65, creativity: 85, risk: 70, attachment: 70 },
  "Virgo": { emotion: 55, logic: 90, social: 65, leadership: 65, security: 85, creativity: 70, risk: 35, attachment: 75 },
  "Libra": { emotion: 70, logic: 75, social: 95, leadership: 75, security: 70, creativity: 80, risk: 60, attachment: 80 },
  "Scorpio": { emotion: 85, logic: 80, social: 60, leadership: 80, security: 75, creativity: 85, risk: 80, attachment: 90 },
  "Sagittarius": { emotion: 65, logic: 75, social: 85, leadership: 85, security: 50, creativity: 85, risk: 90, attachment: 55 },
  "Capricorn": { emotion: 50, logic: 85, social: 60, leadership: 90, security: 95, creativity: 65, risk: 40, attachment: 70 },
  "Aquarius": { emotion: 55, logic: 90, social: 75, leadership: 75, security: 60, creativity: 95, risk: 75, attachment: 50 },
  "Pisces": { emotion: 95, logic: 50, social: 70, leadership: 55, security: 65, creativity: 95, risk: 50, attachment: 85 },
};

// ?賹??剔捂赯菟????冽?31 ?剜???皜????
// ?鞊????垮謑?賹?殉????? ????對??舀０?????蹎?
export const BirthdayPersonalityMap: Record<number, Partial<Record<string, number>>> = {
  1:  { leadership: 6, creativity: 4, risk: 2 },          // ?謢綜髡?????賂???
  2:  { attachment: 6, emotion: 5, social: 3 },            // ???????賹?????
  3:  { creativity: 7, social: 5, emotion: 3 },            // ?萄????????叟■??
  4:  { logic: 6, security: 5, leadership: 2 },            // ?梁捂??????謆ａ?梁?
  5:  { risk: 7, social: 5, creativity: 4 },               // ??玥?????謘?蹇?
  6:  { attachment: 7, security: 5, emotion: 4 },          // ?堆?憸???????舀?
  7:  { logic: 7, creativity: 5, security: 3 },            // ?嚗寞??????單???
  8:  { leadership: 8, logic: 5, risk: 3 },                // ??踝??????????
  9:  { emotion: 7, creativity: 6, social: 4 },            // ???????剔硃??謚恬
  10: { leadership: 6, creativity: 5, social: 4 },         // ?皜??????舐???
  11: { emotion: 8, creativity: 7, attachment: 4 },        // ???純???皜脫香??蛛?
  12: { creativity: 6, social: 6, emotion: 4 },            // ?萄?????喉??謜?
  13: { logic: 6, security: 6, leadership: 3 },            // ?正????????鞈ｆ秘
  14: { risk: 6, creativity: 5, social: 4 },               // ?嚗寞???????瞉?
  15: { leadership: 5, social: 5, attachment: 3 },         // ?儮????剔?????
  16: { logic: 7, security: 5, creativity: 3 },            // ???????????賂
  17: { leadership: 7, logic: 5, risk: 4 },                // ?▽??????????
  18: { emotion: 6, creativity: 5, social: 4 },            // ?嗆╰貔????皜脫香??
  19: { leadership: 7, risk: 5, creativity: 4 },           // ??????????謚急
  20: { attachment: 7, emotion: 6, social: 4 },            // ?賹?????朱瞍???
  21: { social: 7, creativity: 6, emotion: 4 },            // ??殉??????????
  22: { logic: 7, leadership: 6, security: 4 },            // ?梁??????堊????
  23: { risk: 6, creativity: 6, social: 5 },               // ??堊?????叟城??謅疵
  24: { attachment: 7, security: 6, emotion: 4 },          // ?蹇????????賹
  25: { logic: 6, creativity: 6, security: 4 },            // ?皜脫香?????????
  26: { leadership: 6, logic: 5, attachment: 4 },          // ?﹝?????哨撓??謕?
  27: { creativity: 8, emotion: 6, logic: 4 },             // ?豲??????????
  28: { leadership: 6, attachment: 5, emotion: 4 },        // ?蛛?????謚恃???
  29: { emotion: 8, creativity: 6, attachment: 5 },        // ????????????
  30: { social: 7, creativity: 6, leadership: 4 },         // ?瑟?瞍????豯止?剜??
  31: { logic: 6, leadership: 6, security: 5 },            // ?堆?????佇蟡??亙?
};

// ?肅????蝞??謕?
export const BloodTypeMap: Record<string, Record<string, number>> = {
  "A": { logic: 80, security: 85, creativity: 65, risk: 40, social: 70, leadership: 55, attachment: 75, emotion: 60 },
  "B": { creativity: 85, risk: 80, social: 75, emotion: 70, logic: 60, leadership: 70, attachment: 55, security: 50 },
  "AB": { logic: 80, creativity: 80, social: 80, emotion: 65, leadership: 75, security: 70, risk: 60, attachment: 70 },
  "O": { leadership: 85, social: 85, emotion: 75, risk: 75, logic: 65, creativity: 70, attachment: 70, security: 65 },
};

// ?軋??止等????冽?????????剔捂赯?????
// ?鞊????垮?唳謅???剁???梢? ? ?鞈??舀０? ? ?止筐貔???株岳???
export const NameSemanticMap: Record<number, Record<string, number>> = {
  1:  { creativity: 10, leadership: 8, risk: 4 },          // ????謜????????
  2:  { attachment: 8, social: 6, emotion: 4 },            // ??走?儮????遴鬥???
  3:  { creativity: 8, social: 7, emotion: 5 },            // ?萄??剜?萄????威?叟■??
  4:  { security: 8, logic: 6, leadership: 4 },            // ??????謆Ｗ?????謇輸??
  5:  { social: 8, leadership: 6, creativity: 4 },         // ?叟????穿??蹍?????
  6:  { attachment: 9, security: 7, emotion: 5 },          // ????◢?瞉?謘潭??
  7:  { logic: 9, creativity: 7, security: 4 },            // ????嚗寞???朵謒??
  8:  { leadership: 9, logic: 6, risk: 5 },                // ???止撒赯剖????????
  9:  { creativity: 9, emotion: 7, social: 5 },            // ????堆????蛔???
  10: { logic: 7, security: 6, emotion: 5 },               // ??阡???謆????蝞赤
  11: { emotion: 9, creativity: 8, attachment: 5 },        // ?????祉飭????賹?
  12: { creativity: 7, social: 7, emotion: 5 },            // ?喉???????????
  13: { leadership: 8, logic: 6, security: 5 },            // ?蝞??謕???嚗豢??
  14: { risk: 8, creativity: 6, social: 5 },               // ?????謘????謢嗅???
  15: { social: 9, leadership: 7, attachment: 5 },         // ?剔捂???????箇?隤冽?
  16: { logic: 8, attachment: 7, security: 5 },            // ??竣??剔?????鈭斗???
  17: { leadership: 9, logic: 7, risk: 5 },                // ?謜???????????
  18: { logic: 8, leadership: 6, creativity: 5 },          // ????????箄?頦???
  19: { risk: 8, leadership: 7, creativity: 5 },           // ???格????????
  20: { emotion: 9, attachment: 8, social: 4 },            // ?????????謅???
  21: { leadership: 8, creativity: 7, social: 6 },         // ????剜?萄????謜???
  22: { logic: 9, security: 7, leadership: 5 },            // ?剜?????????
  23: { creativity: 9, social: 7, risk: 5 },               // ?剛謒怎擗????嗆??梢?
  24: { attachment: 9, security: 7, emotion: 5 },          // ????????舀????
  25: { logic: 8, creativity: 7, security: 5 },            // ????蝞賂???????
  26: { risk: 8, leadership: 6, creativity: 5 },           // ?璇??蟡?蝯脤?梱齒??
  27: { creativity: 9, logic: 7, emotion: 5 },             // ?豲??蹎∪瓷?璆?豲???
  28: { leadership: 7, risk: 7, attachment: 5 },           // ??瘣蹓魂僮??????蝯?
  29: { emotion: 9, creativity: 8, attachment: 6 },        // ?????????????
  30: { social: 9, creativity: 7, leadership: 5 },         // ?葛???亙??澆??剜?赯望?
  31: { leadership: 8, logic: 7, security: 6 },            // ??蹍餅???蟡?謜???
  35: { logic: 8, security: 7, creativity: 5 },            // ???蝞賂???啣祐撣?
  40: { security: 8, logic: 7, attachment: 5 },            // ??赯脰??迫?????蹓?
  45: { leadership: 8, social: 7, logic: 5 },              // ?剜???止???∵■?日??
  50: { logic: 9, creativity: 7, security: 6 },            // ??謆????謒??謍朝?
  55: { leadership: 9, logic: 7, risk: 5 },                // ???貉蹓魂僮???皝僱?
  60: { attachment: 8, security: 7, social: 5 },           // ????謍啣????寥???
  65: { social: 9, leadership: 7, attachment: 5 },         // ?剔???剜????箏?朵???
  80: { logic: 9, security: 8, creativity: 5 },            // ??冪??餌孕???????
  95: { emotion: 9, creativity: 8, attachment: 6 },        // ?堆??賹????????
  100: { creativity: 10, emotion: 8, attachment: 7 },      // ??察??阡??鈭蝞??
};

// ??對???止?????
export const GenderVoiceMap: Record<string, Record<string, any>> = {
  "male": {
    vocalRange: "C2 - C4",
    naturalMood: "warm, deep, grounded",
    emotionModifier: { emotion: -5, security: 5, logic: 3 },
  },
  "female": {
    vocalRange: "C3 - C5",
    naturalMood: "bright, clear, ethereal",
    emotionModifier: { emotion: 5, creativity: 3, attachment: 5 },
  },
  "non-binary": {
    vocalRange: "A2 - A4",
    naturalMood: "neutral, expressive, adaptive",
    emotionModifier: { creativity: 5, logic: 2, social: 3 },
  },
};

// ??止??摮萄???冽????????荒?? ???剔捂赯菟?潸縣??
export const VoiceCharacteristicMap: Record<string, Partial<Record<string, number>>> = {
  "high_energy": { emotion: 10, risk: 5, creativity: 5 },
  "soft_spoken": { security: 10, attachment: 5, emotion: -3 },
  "rhythmic_speech": { logic: 5, creativity: 3, leadership: 3 },
  "emotional_tone": { emotion: 15, attachment: 10, creativity: 5 },
  "hesitant": { security: -10, leadership: -5, creativity: 2 },
  "confident": { leadership: 15, risk: 8, social: 5 },
  "voice_recorded": { emotion: 4, creativity: 4, attachment: 3 },
  "bright_voice": { social: 6, creativity: 4, leadership: 3 },
  "deep_resonance": { security: 7, attachment: 4, logic: 3 },
  "clear_projection": { leadership: 8, social: 5, security: 2 },
  "inner_dialogue_voice": { emotion: 8, attachment: 7, creativity: 5 },
};

// ?????塗?豰?
export interface MusicParameters {
  bpm: number;
  key: string;
  genre: string;
  mood: string[];
  vocal_style: string;
  instrument: string[];
  lyric_theme: string[];
}

// ???瞉??鞎??謜冪?????塗?????
export const PersonalityToMusicMapping = {
  emotion: {
    high: { mood: ["emotional", "expressive", "intimate"], vocal_style: "soulful, vulnerable" },
    low: { mood: ["calm", "introspective", "minimalist"], vocal_style: "restrained, subtle" },
  },
  creativity: {
    high: { genre: "experimental", instrument: ["synth", "ambient_pad"], mood: ["imaginative", "surreal"] },
    low: { genre: "classic_pop", instrument: ["acoustic", "piano"], mood: ["familiar", "accessible"] },
  },
  leadership: {
    high: { mood: ["confident", "powerful"], vocal_style: "commanding, clear", bpm_adjust: 10 },
    low: { mood: ["contemplative", "humble"], vocal_style: "gentle, reflective", bpm_adjust: -10 },
  },
  security: {
    high: { mood: ["stable", "grounded"], instrument: ["bass", "drums"], lyric_theme: ["balance", "harmony"] },
    low: { mood: ["adventurous", "uncertain"], instrument: ["string", "wind"], lyric_theme: ["discovery", "risk"] },
  },
  attachment: {
    high: { lyric_theme: ["connection", "love", "memory"], vocal_style: "warm, intimate" },
    low: { lyric_theme: ["independence", "solitude", "freedom"], vocal_style: "detached, artistic" },
  },
  risk: {
    high: { genre: "electronic_experimental", bpm_adjust: 15, mood: ["edgy", "unconventional"] },
    low: { genre: "soft_pop", bpm_adjust: -15, mood: ["safe", "traditional"] },
  },
};
