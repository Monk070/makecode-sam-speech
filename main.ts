/**
 * SAM Text-to-Speech for MakeCode Arcade
 * Based on authentic SAM algorithm with accurate formant synthesis
 * Formula: A = A1*sin(f1*t) + A2*sin(f2*t) + A3*rect(f3*t)
 */

//% color="#4287f5" icon="\uf130" block="SAM"
namespace SAM {
    
    export enum VoicePreset {
        //% block="SAM (default)"
        SAM,
        //% block="Elf"
        Elf,
        //% block="Little Robot"
        LittleRobot,
        //% block="Stuffy Guy"
        StuffyGuy,
        //% block="Little Old Lady"
        LittleOldLady,
        //% block="Extra Terrestrial"
        ExtraTerrestrial
    }
    
    let pitch = 64;
    let speed = 72;
    let throat = 128;
    let mouth = 128;
    let currentPitch = 64;
    
    // Previous phoneme formants for interpolation
    let prevF1 = 0;
    let prevF2 = 0;
    let prevF3 = 0;
    let prevA1 = 0;
    let prevA2 = 0;
    let prevA3 = 0;

    // Authentic SAM formant synthesis with smooth interpolation
    function playFormants(f1: number, f2: number, f3: number, a1: number, a2: number, a3: number, dur: number, voiced: boolean = true): void {
        // Scale formants by throat/mouth (SAM algorithm)
        f1 = Math.round(f1 * throat / 128);
        f2 = Math.round(f2 * mouth / 128);
        f3 = Math.round(f3 * mouth / 128);
        
        // Clamp to buzzer-friendly ranges
        f1 = Math.max(180, Math.min(f1, 950));
        f2 = Math.max(600, Math.min(f2, 2800));
        f3 = Math.max(1700, Math.min(f3, 3700));
        
        // Adjust duration for speed
        const adjDur = Math.round(dur * (72 / speed));
        
        if (voiced) {
            const pitchFreq = currentPitch * 3.5;
            const pulseRate = 1000 / pitchFreq;
            const numPulses = Math.max(3, Math.floor(adjDur / pulseRate));
            const pulseDur = Math.floor(adjDur / numPulses);
            
            // Calculate interpolation targets
            const hasHistory = prevF1 > 0;
            const transitionPulses = hasHistory ? Math.min(2, numPulses) : 0;
            
            for (let i = 0; i < numPulses; i++) {
                const pitchVar = 1 + (Math.sin(i * 0.3) * 0.02);
                const variedPitch = pitchFreq * pitchVar;
                
                // Smooth interpolation from previous phoneme
                let currentF1 = f1, currentF2 = f2, currentF3 = f3;
                let currentA1 = a1, currentA2 = a2, currentA3 = a3;
                
                if (i < transitionPulses) {
                    const blend = (i + 1) / (transitionPulses + 1);
                    currentF1 = Math.round(prevF1 + (f1 - prevF1) * blend);
                    currentF2 = Math.round(prevF2 + (f2 - prevF2) * blend);
                    currentF3 = Math.round(prevF3 + (f3 - prevF3) * blend);
                    currentA1 = Math.round(prevA1 + (a1 - prevA1) * blend);
                    currentA2 = Math.round(prevA2 + (a2 - prevA2) * blend);
                    currentA3 = Math.round(prevA3 + (a3 - prevA3) * blend);
                }
                
                // Glottal pulse
                music.play(music.createSoundEffect(
                    WaveShape.Sawtooth, variedPitch, variedPitch, 
                    120, 0, pulseDur * 0.4, 
                    SoundExpressionEffect.None, InterpolationCurve.Linear
                ), music.PlaybackMode.InBackground);
                
                // F1: Sine wave - boosted for clarity
                music.play(music.createSoundEffect(
                    WaveShape.Sine, currentF1, currentF1, 
                    Math.min(255, currentA1 + 10), 0, pulseDur, 
                    SoundExpressionEffect.None, InterpolationCurve.Linear
                ), music.PlaybackMode.InBackground);
                
                // F2: Sine wave
                music.play(music.createSoundEffect(
                    WaveShape.Sine, currentF2, currentF2, 
                    Math.min(255, currentA2 + 5), 0, pulseDur, 
                    SoundExpressionEffect.None, InterpolationCurve.Linear
                ), music.PlaybackMode.InBackground);
                
                // F3: Square wave
                music.play(music.createSoundEffect(
                    WaveShape.Square, currentF3, currentF3, 
                    Math.max(20, currentA3 - 5), 0, pulseDur, 
                    SoundExpressionEffect.None, InterpolationCurve.Linear
                ), music.PlaybackMode.InBackground);
                
                pause(pulseDur);
            }
            
            // Store for next phoneme's interpolation
            prevF1 = f1; prevF2 = f2; prevF3 = f3;
            prevA1 = a1; prevA2 = a2; prevA3 = a3;
        } else {
            pause(adjDur);
            // Store silence as previous state
            prevF1 = f1; prevF2 = f2; prevF3 = f3;
            prevA1 = 0; prevA2 = 0; prevA3 = 0;
        }
    }

    function noise(freq: number, dur: number, vol: number): void {
        const adjDur = Math.round(dur * (72 / speed));
        music.play(music.createSoundEffect(
            WaveShape.Noise, freq, freq, vol, 0, adjDur, 
            SoundExpressionEffect.None, InterpolationCurve.Linear
        ), music.PlaybackMode.UntilDone);
    }

    function phoneme(ph: string): void {
        const d = 95; // Slightly longer for clarity (like Little Old Lady's slower pace)
        
        // Phoneme-based pitch variation
        if ("AEIOUY".indexOf(ph.charAt(0)) >= 0) {
            currentPitch = pitch + 1; // Reduced variation
        } else if ("PTKFS".indexOf(ph.charAt(0)) >= 0) {
            currentPitch = pitch - 0.5; // Minimal variation
        } else {
            currentPitch = pitch;
        }
        
        // Vowels with boosted clarity (higher A1, balanced A2, softer A3)
        if (ph === "IY") playFormants(270, 2290, 3010, 255, 145, 65, d);
        else if (ph === "IH") playFormants(390, 1990, 2550, 255, 145, 65, d);
        else if (ph === "EH") playFormants(530, 1840, 2480, 255, 145, 65, d);
        else if (ph === "AE") playFormants(660, 1720, 2410, 255, 150, 70, d);
        else if (ph === "AA") playFormants(730, 1090, 2440, 255, 155, 75, d);
        else if (ph === "AO") playFormants(570, 840, 2410, 255, 150, 70, d);
        else if (ph === "UH") playFormants(440, 1020, 2240, 255, 140, 60, d);
        else if (ph === "UW") playFormants(300, 870, 2240, 255, 135, 55, d);
        else if (ph === "AH") playFormants(640, 1190, 2390, 255, 145, 65, d);
        else if (ph === "ER") playFormants(490, 1350, 1690, 255, 145, 65, d);
        
        // Diphthongs - smooth transitions with clarity focus
        else if (ph === "AY") {
            playFormants(660, 1720, 2410, 255, 150, 70, d * 0.44);
            playFormants(270, 2290, 3010, 255, 145, 65, d * 0.56);
        }
        else if (ph === "EY") {
            playFormants(530, 1840, 2480, 255, 145, 65, d * 0.44);
            playFormants(270, 2290, 3010, 255, 145, 65, d * 0.56);
        }
        else if (ph === "OW") {
            playFormants(570, 840, 2410, 255, 150, 70, d * 0.44);
            playFormants(300, 870, 2240, 255, 135, 55, d * 0.56);
        }
        else if (ph === "AW") {
            playFormants(730, 1090, 2440, 255, 155, 75, d * 0.44);
            playFormants(300, 870, 2240, 255, 135, 55, d * 0.56);
        }
        else if (ph === "OY") {
            playFormants(570, 840, 2410, 255, 150, 70, d * 0.44);
            playFormants(270, 2290, 3010, 255, 145, 65, d * 0.56);
        }
        
        // Stops - cleaner with better separation
        else if (ph === "P") { pause(d * 0.30); noise(1700, d * 0.10, 155); pause(d * 0.06); }
        else if (ph === "B") { pause(d * 0.22); noise(900, d * 0.06, 115); playFormants(280, 900, 1700, 245, 120, 45, d * 0.18); }
        else if (ph === "T") { pause(d * 0.32); noise(5500, d * 0.14, 200); pause(d * 0.04); } // Sharper, higher freq
        else if (ph === "D") { pause(d * 0.22); noise(2500, d * 0.06, 115); playFormants(280, 900, 1700, 245, 120, 45, d * 0.18); }
        else if (ph === "K") { pause(d * 0.30); noise(2900, d * 0.10, 160); pause(d * 0.06); }
        else if (ph === "G") { pause(d * 0.22); noise(1500, d * 0.06, 105); playFormants(280, 900, 1700, 245, 120, 45, d * 0.18); }
        
        // Fricatives - clearer noise balance
        else if (ph === "F") noise(5000, d * 0.64, 105);
        else if (ph === "V") { playFormants(180, 1300, 2300, 250, 125, 50, d * 0.64); noise(2800, d * 0.20, 38); }
        else if (ph === "S") noise(6800, d * 0.64, 135);
        else if (ph === "Z") { playFormants(180, 1600, 2500, 250, 130, 50, d * 0.64); noise(5800, d * 0.20, 48); }
        else if (ph === "SH") noise(4000, d * 0.74, 145);
        else if (ph === "ZH") { playFormants(180, 1500, 2300, 250, 128, 50, d * 0.70); noise(3400, d * 0.20, 48); }
        else if (ph === "TH") noise(4500, d * 0.64, 95);
        else if (ph === "DH") { playFormants(180, 1700, 2500, 250, 130, 50, d * 0.64); noise(4000, d * 0.20, 38); }
        else if (ph === "HH") noise(2400, d * 0.44, 75);
        
        // Nasals - fuller resonance with clarity
        else if (ph === "M") playFormants(280, 1300, 2200, 255, 135, 55, d * 1.04);
        else if (ph === "N") playFormants(280, 1700, 2600, 255, 138, 57, d * 1.04);
        else if (ph === "NG") playFormants(280, 2300, 3000, 255, 140, 60, d * 1.04);
        
        // Liquids - smooth and present
        else if (ph === "L") playFormants(360, 1300, 2500, 255, 135, 55, d * 0.84);
        else if (ph === "R") playFormants(420, 1300, 1700, 255, 138, 57, d * 0.84);
        
        // Glides - clear and natural
        else if (ph === "W") playFormants(300, 610, 2200, 252, 130, 53, d * 0.64);
        else if (ph === "Y") playFormants(280, 2250, 3100, 255, 138, 57, d * 0.64);
        
        // Affricates - clear compound sounds
        else if (ph === "CH") {
            pause(d * 0.22);
            noise(3200, d * 0.13, 135);
            noise(4000, d * 0.32, 125);
        }
        else if (ph === "JH") {
            pause(d * 0.22);
            noise(2600, d * 0.10, 115);
            playFormants(180, 1700, 2300, 250, 128, 50, d * 0.28);
        }
        
        // Silence - slightly longer for clarity
        else if (ph === "_") pause(d * 0.45);
        
        pause(1); // Minimal gap for smoothness
    }

    function word(text: string): string {
        text = text.toLowerCase();
        
        // EXPANDED DICTIONARY - Common words with proper pronunciations
        // Articles & Pronouns
        if (text === "the") return "DH AH";
        if (text === "a") return "AH";
        if (text === "an") return "AE N";
        if (text === "i") return "AY";
        if (text === "you") return "Y UW";
        if (text === "he") return "HH IY";
        if (text === "she") return "SH IY";
        if (text === "it") return "IH T";
        if (text === "we") return "W IY";
        if (text === "they") return "DH EY";
        if (text === "me") return "M IY";
        if (text === "my") return "M AY";
        if (text === "your") return "Y AO R";
        if (text === "his") return "HH IH Z";
        if (text === "her") return "HH ER";
        if (text === "its") return "IH T S";
        if (text === "our") return "AW ER";
        if (text === "their") return "DH EH R";
        if (text === "this") return "DH IH S";
        if (text === "that") return "DH AE T";
        if (text === "these") return "DH IY Z";
        if (text === "those") return "DH OW Z";
        
        // Common Verbs
        if (text === "is") return "IH Z";
        if (text === "are") return "AA R";
        if (text === "was") return "W AA Z";
        if (text === "were") return "W ER";
        if (text === "be") return "B IY";
        if (text === "been") return "B IH N";
        if (text === "have") return "HH AE V";
        if (text === "has") return "HH AE Z";
        if (text === "had") return "HH AE D";
        if (text === "do") return "D UW";
        if (text === "does") return "D AH Z";
        if (text === "did") return "D IH D";
        if (text === "can") return "K AE N";
        if (text === "could") return "K UH D";
        if (text === "will") return "W IH L";
        if (text === "would") return "W UH D";
        if (text === "should") return "SH UH D";
        if (text === "go") return "G OW";
        if (text === "get") return "G EH T";
        if (text === "make") return "M EY K";
        if (text === "see") return "S IY";
        if (text === "look") return "L UH K";
        if (text === "come") return "K AH M";
        if (text === "take") return "T EY K";
        if (text === "know") return "N OW";
        if (text === "think") return "TH IH NG K";
        if (text === "say") return "S EY";
        if (text === "tell") return "T EH L";
        if (text === "want") return "W AA N T";
        if (text === "use") return "Y UW Z";
        if (text === "find") return "F AY N D";
        if (text === "give") return "G IH V";
        if (text === "work") return "W ER K";
        if (text === "call") return "K AO L";
        if (text === "try") return "T R AY";
        if (text === "ask") return "AE S K";
        if (text === "need") return "N IY D";
        if (text === "feel") return "F IY L";
        if (text === "become") return "B IH K AH M";
        if (text === "leave") return "L IY V";
        if (text === "put") return "P UH T";
        if (text === "mean") return "M IY N";
        if (text === "keep") return "K IY P";
        if (text === "let") return "L EH T";
        if (text === "begin") return "B IH G IH N";
        if (text === "seem") return "S IY M";
        if (text === "help") return "HH EH L P";
        if (text === "show") return "SH OW";
        if (text === "hear") return "HH IH R";
        if (text === "play") return "P L EY";
        if (text === "run") return "R AH N";
        if (text === "move") return "M UW V";
        if (text === "like") return "L AY K";
        if (text === "live") return "L IH V";
        if (text === "believe") return "B IH L IY V";
        if (text === "bring") return "B R IH NG";
        if (text === "happen") return "HH AE P AH N";
        if (text === "write") return "R AY T";
        if (text === "sit") return "S IH T";
        if (text === "stand") return "S T AE N D";
        if (text === "lose") return "L UW Z";
        if (text === "pay") return "P EY";
        if (text === "meet") return "M IY T";
        if (text === "include") return "IH N K L UW D";
        if (text === "continue") return "K AH N T IH N Y UW";
        if (text === "set") return "S EH T";
        if (text === "learn") return "L ER N";
        if (text === "change") return "CH EY N JH";
        if (text === "lead") return "L IY D";
        if (text === "understand") return "AH N D ER S T AE N D";
        if (text === "watch") return "W AA CH";
        if (text === "follow") return "F AA L OW";
        if (text === "stop") return "S T AA P";
        if (text === "create") return "K R IY EY T";
        if (text === "speak") return "S P IY K";
        if (text === "read") return "R IY D";
        if (text === "spend") return "S P EH N D";
        if (text === "grow") return "G R OW";
        if (text === "open") return "OW P AH N";
        if (text === "walk") return "W AO K";
        if (text === "win") return "W IH N";
        if (text === "teach") return "T IY CH";
        if (text === "offer") return "AA F ER";
        if (text === "remember") return "R IH M EH M B ER";
        if (text === "consider") return "K AH N S IH D ER";
        if (text === "appear") return "AH P IH R";
        if (text === "buy") return "B AY";
        if (text === "wait") return "W EY T";
        if (text === "serve") return "S ER V";
        if (text === "die") return "D AY";
        if (text === "send") return "S EH N D";
        if (text === "build") return "B IH L D";
        if (text === "stay") return "S T EY";
        if (text === "fall") return "F AO L";
        if (text === "cut") return "K AH T";
        if (text === "reach") return "R IY CH";
        if (text === "kill") return "K IH L";
        if (text === "raise") return "R EY Z";
        if (text === "pass") return "P AE S";
        if (text === "sell") return "S EH L";
        if (text === "decide") return "D IH S AY D";
        if (text === "return") return "R IH T ER N";
        if (text === "explain") return "IH K S P L EY N";
        if (text === "hope") return "HH OW P";
        if (text === "develop") return "D IH V EH L AH P";
        if (text === "carry") return "K AE R IY";
        if (text === "break") return "B R EY K";
        if (text === "receive") return "R IH S IY V";
        if (text === "agree") return "AH G R IY";
        if (text === "support") return "S AH P AO R T";
        if (text === "hit") return "HH IH T";
        if (text === "produce") return "P R AH D UW S";
        if (text === "eat") return "IY T";
        if (text === "cover") return "K AH V ER";
        if (text === "catch") return "K AE CH";
        if (text === "draw") return "D R AO";
        
        // Prepositions & Conjunctions
        if (text === "to") return "T UW";
        if (text === "of") return "AH V";
        if (text === "in") return "IH N";
        if (text === "for") return "F AO R";
        if (text === "on") return "AA N";
        if (text === "with") return "W IH DH";
        if (text === "at") return "AE T";
        if (text === "by") return "B AY";
        if (text === "from") return "F R AH M";
        if (text === "up") return "AH P";
        if (text === "about") return "AH B AW T";
        if (text === "into") return "IH N T UW";
        if (text === "through") return "TH R UW";
        if (text === "after") return "AE F T ER";
        if (text === "over") return "OW V ER";
        if (text === "between") return "B IH T W IY N";
        if (text === "out") return "AW T";
        if (text === "against") return "AH G EH N S T";
        if (text === "during") return "D UH R IH NG";
        if (text === "without") return "W IH DH AW T";
        if (text === "before") return "B IH F AO R";
        if (text === "under") return "AH N D ER";
        if (text === "around") return "AH R AW N D";
        if (text === "among") return "AH M AH NG";
        if (text === "and") return "AE N D";
        if (text === "or") return "AO R";
        if (text === "but") return "B AH T";
        if (text === "if") return "IH F";
        if (text === "because") return "B IH K AO Z";
        if (text === "as") return "AE Z";
        if (text === "until") return "AH N T IH L";
        if (text === "while") return "W AY L";
        if (text === "although") return "AO L DH OW";
        if (text === "whether") return "W EH DH ER";
        if (text === "than") return "DH AE N";
        if (text === "so") return "S OW";
        if (text === "when") return "W EH N";
        if (text === "where") return "W EH R";
        if (text === "why") return "W AY";
        if (text === "how") return "HH AW";
        
        // Common Nouns & Adjectives
        if (text === "time") return "T AY M";
        if (text === "year") return "Y IH R";
        if (text === "day") return "D EY";
        if (text === "thing") return "TH IH NG";
        if (text === "man") return "M AE N";
        if (text === "woman") return "W UH M AH N";
        if (text === "person") return "P ER S AH N";
        if (text === "child") return "CH AY L D";
        if (text === "way") return "W EY";
        if (text === "world") return "W ER L D";
        if (text === "life") return "L AY F";
        if (text === "hand") return "HH AE N D";
        if (text === "part") return "P AA R T";
        if (text === "place") return "P L EY S";
        if (text === "case") return "K EY S";
        if (text === "week") return "W IY K";
        if (text === "company") return "K AH M P AH N IY";
        if (text === "system") return "S IH S T AH M";
        if (text === "program") return "P R OW G R AE M";
        if (text === "question") return "K W EH S CH AH N";
        if (text === "work") return "W ER K";
        if (text === "government") return "G AH V ER N M AH N T";
        if (text === "number") return "N AH M B ER";
        if (text === "night") return "N AY T";
        if (text === "point") return "P OY N T";
        if (text === "home") return "HH OW M";
        if (text === "water") return "W AO T ER";
        if (text === "room") return "R UW M";
        if (text === "mother") return "M AH DH ER";
        if (text === "area") return "EH R IY AH";
        if (text === "money") return "M AH N IY";
        if (text === "story") return "S T AO R IY";
        if (text === "fact") return "F AE K T";
        if (text === "month") return "M AH N TH";
        if (text === "lot") return "L AA T";
        if (text === "right") return "R AY T";
        if (text === "study") return "S T AH D IY";
        if (text === "book") return "B UH K";
        if (text === "eye") return "AY";
        if (text === "job") return "JH AA B";
        if (text === "word") return "W ER D";
        if (text === "business") return "B IH Z N IH S";
        if (text === "issue") return "IH SH UW";
        if (text === "side") return "S AY D";
        if (text === "kind") return "K AY N D";
        if (text === "head") return "HH EH D";
        if (text === "house") return "HH AW S";
        if (text === "service") return "S ER V IH S";
        if (text === "friend") return "F R EH N D";
        if (text === "father") return "F AA DH ER";
        if (text === "power") return "P AW ER";
        if (text === "hour") return "AW ER";
        if (text === "game") return "G EY M";
        if (text === "line") return "L AY N";
        if (text === "end") return "EH N D";
        if (text === "member") return "M EH M B ER";
        if (text === "law") return "L AO";
        if (text === "car") return "K AA R";
        if (text === "city") return "S IH T IY";
        if (text === "community") return "K AH M Y UW N IH T IY";
        if (text === "name") return "N EY M";
        if (text === "president") return "P R EH Z IH D AH N T";
        if (text === "team") return "T IY M";
        if (text === "minute") return "M IH N IH T";
        if (text === "idea") return "AY D IY AH";
        if (text === "kid") return "K IH D";
        if (text === "body") return "B AA D IY";
        if (text === "information") return "IH N F ER M EY SH AH N";
        if (text === "back") return "B AE K";
        if (text === "parent") return "P EH R AH N T";
        if (text === "face") return "F EY S";
        if (text === "others") return "AH DH ER Z";
        if (text === "level") return "L EH V EH L";
        if (text === "office") return "AA F IH S";
        if (text === "door") return "D AO R";
        if (text === "health") return "HH EH L TH";
        if (text === "art") return "AA R T";
        if (text === "war") return "W AO R";
        if (text === "history") return "HH IH S T AO R IY";
        if (text === "party") return "P AA R T IY";
        if (text === "result") return "R IH Z AH L T";
        if (text === "change") return "CH EY N JH";
        if (text === "morning") return "M AO R N IH NG";
        if (text === "reason") return "R IY Z AH N";
        if (text === "research") return "R IY S ER CH";
        if (text === "girl") return "G ER L";
        if (text === "guy") return "G AY";
        if (text === "moment") return "M OW M AH N T";
        if (text === "air") return "EH R";
        if (text === "teacher") return "T IY CH ER";
        if (text === "force") return "F AO R S";
        if (text === "education") return "EH JH AH K EY SH AH N";
        
        // Common Adjectives
        if (text === "good") return "G UH D";
        if (text === "new") return "N UW";
        if (text === "first") return "F ER S T";
        if (text === "last") return "L AE S T";
        if (text === "long") return "L AO NG";
        if (text === "great") return "G R EY T";
        if (text === "little") return "L IH T AH L";
        if (text === "own") return "OW N";
        if (text === "other") return "AH DH ER";
        if (text === "old") return "OW L D";
        if (text === "right") return "R AY T";
        if (text === "big") return "B IH G";
        if (text === "high") return "HH AY";
        if (text === "different") return "D IH F ER AH N T";
        if (text === "small") return "S M AO L";
        if (text === "large") return "L AA R JH";
        if (text === "next") return "N EH K S T";
        if (text === "early") return "ER L IY";
        if (text === "young") return "Y AH NG";
        if (text === "important") return "IH M P AO R T AH N T";
        if (text === "few") return "F Y UW";
        if (text === "public") return "P AH B L IH K";
        if (text === "bad") return "B AE D";
        if (text === "same") return "S EY M";
        if (text === "able") return "EY B AH L";
        
        // Numbers
        if (text === "one") return "W AH N";
        if (text === "two") return "T UW";
        if (text === "three") return "TH R IY";
        if (text === "four") return "F AO R";
        if (text === "five") return "F AY V";
        if (text === "six") return "S IH K S";
        if (text === "seven") return "S EH V AH N";
        if (text === "eight") return "EY T";
        if (text === "nine") return "N AY N";
        if (text === "ten") return "T EH N";
        
        // Greetings & Common Phrases
        if (text === "hello") return "HH EH L OW";
        if (text === "hi") return "HH AY";
        if (text === "hey") return "HH EY";
        if (text === "bye") return "B AY";
        if (text === "goodbye") return "G UH D B AY";
        if (text === "please") return "P L IY Z";
        if (text === "thanks") return "TH AE NG K S";
        if (text === "thank") return "TH AE NG K";
        if (text === "sorry") return "S AA R IY";
        if (text === "yes") return "Y EH S";
        if (text === "no") return "N OW";
        if (text === "ok") return "OW K EY";
        if (text === "okay") return "OW K EY";
        
        // Game-related words
        if (text === "game") return "G EY M";
        if (text === "player") return "P L EY ER";
        if (text === "score") return "S K AO R";
        if (text === "level") return "L EH V EH L";
        if (text === "start") return "S T AA R T";
        if (text === "ready") return "R EH D IY";
        if (text === "winner") return "W IH N ER";
        if (text === "loser") return "L UW Z ER";
        if (text === "point") return "P OY N T";
        if (text === "points") return "P OY N T S";
        
        // Test words
        if (text === "test") return "T EH S T";
        if (text === "mary") return "M EH R IY";
        if (text === "lamb") return "L AE M";
        if (text === "tree") return "T R IY";
        if (text === "cat") return "K AE T";
        if (text === "dog") return "D AO G";
        
        // Letter-to-phoneme fallback
        let ph = "";
        for (let i = 0; i < text.length; i++) {
            const c = text.charAt(i);
            const n = i + 1 < text.length ? text.charAt(i + 1) : "";
            const p = i > 0 ? text.charAt(i - 1) : "";
            
            if (c === "a") {
                if (n === "i" || n === "y") { ph += "EY "; i++; }
                else if (n === "w") { ph += "AW "; i++; }
                else if (n === "r") ph += "AA ";
                else ph += "AE ";
            }
            else if (c === "e") {
                if (n === "e") { ph += "IY "; i++; }
                else if (n === "w") { ph += "UW "; i++; }
                else if (i === text.length - 1) ph += "";
                else if (n === "y") { ph += "EY "; i++; }
                else ph += "EH ";
            }
            else if (c === "i") {
                if (n === "e") { ph += "IY "; i++; }
                else if (i === text.length - 1 && p !== "a") ph += "AY ";
                else ph += "IH ";
            }
            else if (c === "o") {
                if (n === "o") { ph += "UW "; i++; }
                else if (n === "w") { ph += "OW "; i++; }
                else if (n === "y") { ph += "OY "; i++; }
                else ph += "AA ";
            }
            else if (c === "u") {
                if (n === "e") { ph += "UW "; i++; }
                else ph += "AH ";
            }
            else if (c === "y") ph += "IY ";
            else if (c === "b") ph += "B ";
            else if (c === "d") ph += "D ";
            else if (c === "f") ph += "F ";
            else if (c === "g") ph += "G ";
            else if (c === "h") ph += "HH ";
            else if (c === "j") ph += "JH ";
            else if (c === "k") ph += "K ";
            else if (c === "l") ph += "L ";
            else if (c === "m") ph += "M ";
            else if (c === "n") {
                if (n === "g") { ph += "NG "; i++; }
                else ph += "N ";
            }
            else if (c === "p") ph += "P ";
            else if (c === "r") ph += "R ";
            else if (c === "s") {
                if (n === "h") { ph += "SH "; i++; }
                else ph += "S ";
            }
            else if (c === "t") {
                if (n === "h") { ph += "TH "; i++; }
                else ph += "T ";
            }
            else if (c === "v") ph += "V ";
            else if (c === "w") ph += "W ";
            else if (c === "z") ph += "Z ";
            else if (c === "c") {
                if (n === "h") { ph += "CH "; i++; }
                else if (n === "e" || n === "i" || n === "y") ph += "S ";
                else ph += "K ";
            }
            else if (c === "x") ph += "K S ";
            else if (c === "q") ph += "K W ";
        }
        return ph.trim();
    }

    /**
     * Speak text using SAM voice
     * @param text the text to speak
     */
    //% block="speak $text"
    //% text.defl="Mary had a little lamb"
    //% weight=100
    export function speak(text: string): void {
        if (!text) return;
        
        // Reset interpolation history at start of new utterance
        prevF1 = 0; prevF2 = 0; prevF3 = 0;
        prevA1 = 0; prevA2 = 0; prevA3 = 0;
        
        const hasPeriod = text.indexOf(".") >= 0;
        const hasQuestion = text.indexOf("?") >= 0;
        const words = text.split(" ");
        const wordCount = words.length;
        
        for (let i = 0; i < wordCount; i++) {
            const w = words[i];
            if (!w) continue;
            
            // Natural pitch contour
            if (hasQuestion && i === wordCount - 1) {
                currentPitch = pitch + 8;
            } else if (hasPeriod && i === wordCount - 1) {
                currentPitch = pitch - 6;
            } else if (i === 0) {
                currentPitch = pitch + 3;
            } else {
                currentPitch = pitch + (i % 2 === 0 ? 1 : -1);
            }
            
            const ph = word(w).split(" ");
            for (let p of ph) {
                if (p) phoneme(p);
            }
            phoneme("_");
        }
        
        currentPitch = pitch;
    }

    /**
     * Set voice to a preset character
     * @param preset the voice preset to use
     */
    //% block="set voice to $preset"
    //% preset.defl=VoicePreset.SAM
    //% weight=90
    export function setVoicePreset(preset: VoicePreset): void {
        switch (preset) {
            case VoicePreset.SAM:
                speed = 72; pitch = 64; throat = 128; mouth = 128; break;
            case VoicePreset.Elf:
                speed = 72; pitch = 64; throat = 110; mouth = 160; break;
            case VoicePreset.LittleRobot:
                speed = 92; pitch = 60; throat = 190; mouth = 190; break;
            case VoicePreset.StuffyGuy:
                speed = 82; pitch = 72; throat = 110; mouth = 105; break;
            case VoicePreset.LittleOldLady:
                speed = 82; pitch = 32; throat = 145; mouth = 145; break;
            case VoicePreset.ExtraTerrestrial:
                speed = 100; pitch = 64; throat = 150; mouth = 200; break;
        }
        currentPitch = pitch;
    }

    /**
     * Set custom voice parameters with sliders
     */
    //% block="set voice speed $speedVal pitch $pitchVal throat $throatVal mouth $mouthVal"
    //% speedVal.defl=72
    //% pitchVal.defl=64
    //% throatVal.defl=128
    //% mouthVal.defl=128
    //% inlineInputMode=inline
    //% weight=88
    export function setVoiceCustom(speedVal: number = 72, pitchVal: number = 64, throatVal: number = 128, mouthVal: number = 128): void {
        speed = Math.max(40, Math.min(120, speedVal));
        pitch = Math.max(32, Math.min(96, pitchVal));
        throat = Math.max(50, Math.min(200, throatVal));
        mouth = Math.max(50, Math.min(200, mouthVal));
        currentPitch = pitch;
    }

    /**
     * Speak text with a specific voice preset
     * @param text the text to speak
     * @param preset the voice preset to use
     */
    //% block="speak $text with voice $preset"
    //% text.defl="Mary had a little lamb"
    //% preset.defl=VoicePreset.SAM
    //% weight=85
    export function speakWithPreset(text: string, preset: VoicePreset): void {
        const [savedP, savedS, savedT, savedM] = [pitch, speed, throat, mouth];
        setVoicePreset(preset);
        speak(text);
        [pitch, speed, throat, mouth] = [savedP, savedS, savedT, savedM];
    }

    /**
     * Set voice pitch (32-96, default 64)
     */
    //% block="set pitch to $value"
    //% value.min=32 value.max=96 value.defl=64
    //% weight=75
    //% advanced=true
    export function setPitch(value: number): void {
        pitch = Math.max(32, Math.min(96, value));
    }

    /**
     * Set speech speed (40-120, default 72)
     */
    //% block="set speed to $value"
    //% value.min=40 value.max=120 value.defl=72
    //% weight=70
    //% advanced=true
    export function setSpeed(value: number): void {
        speed = Math.max(40, Math.min(120, value));
    }

    /**
     * Set throat size (affects F1, 50-200, default 128)
     */
    //% block="set throat to $value"
    //% value.min=50 value.max=200 value.defl=128
    //% weight=65
    //% advanced=true
    export function setThroat(value: number): void {
        throat = Math.max(50, Math.min(200, value));
    }

    /**
     * Set mouth size (affects F2/F3, 50-200, default 128)
     */
    //% block="set mouth to $value"
    //% value.min=50 value.max=200 value.defl=128
    //% weight=60
    //% advanced=true
    export function setMouth(value: number): void {
        mouth = Math.max(50, Math.min(200, value));
    }

    /**
     * Test the current voice settings
     */
    //% block="test voice"
    //% weight=55
    export function testVoice(): void {
        speak("test");
    }

    /**
     * Reset voice to SAM default
     */
    //% block="reset voice"
    //% weight=50
    export function resetVoice(): void {
        setVoicePreset(VoicePreset.SAM);
    }
}