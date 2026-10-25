// Game data: items, treatment moves, and the eternal patient roster.
// Attack: t = text, s = stat hit ('san' | 'rsp'), d = base damage, g = demands grow by g.

window.ITEMS = {
  coffee:   { name: 'COFFEE', desc: '+15 SANITY. TASTES LIKE REGRET.', heal: { san: 15 } },
  poster:   { name: 'MOTIVATIONAL POSTER', desc: '+12 SELF-RESPECT. HANG IN THERE, KITTEN.', heal: { rsp: 12 } },
  donut:    { name: 'STALE DONUT', desc: '+8 SAN, +6 RSP. FROM THE 1987 STAFF MEETING.', heal: { san: 8, rsp: 6 } },
  sandwich: { name: 'TURKEY SANDWICH', desc: '16 DMG. THE ANCIENT CURRENCY OF THE ER.', dmg: 16 },
  icechips: { name: 'ICE CHIPS', desc: '10 DMG. PATIENTS LOVE THEM. NOBODY KNOWS WHY.', dmg: 10 },
  worknote: { name: 'WORK NOTE', desc: '14 DMG. EXCUSES THEM FROM LIFE.', dmg: 14 },
  blanket:  { name: 'WARM BLANKET', desc: '12 DMG. FRESH FROM THE BLANKET WARMER.', dmg: 12 },
};
window.START_ITEMS = { coffee: 2, poster: 1, sandwich: 1, icechips: 2 };

window.MOVES = [
  { id: 'diagnose', name: 'DIAGNOSE', desc: '6-9 DMG. RELIABLE.', min: 6, max: 9 },
  { id: 'reassure', name: 'REASSURE', desc: '3-6 DMG. HALVES NEXT COMPLAINT.', min: 3, max: 6, calm: true },
  { id: 'pamphlet', name: 'PAMPHLET', desc: '10-15 DMG. MAY BACKFIRE.', min: 10, max: 15, backfire: 0.35 },
  { id: 'hellfire', name: 'HELLFIRE GAZE', desc: '15-22 DMG. COSTS 6 RSP.', min: 15, max: 22, cost: 6 },
];

window.FLAVOR = {
  diagnoses: ["IT'S A COLD.", "YOU'RE FINE.", "THAT'S A MOSQUITO BITE.", "IT'S GAS.", 'DRINK SOME WATER.',
    "THAT'S JUST YOUR PULSE.", "IT'S CALLED BEING TIRED.", 'YOU HAVE... A FOOT.', "THAT'S A FRECKLE.",
    'YOU ATE 40 HOT WINGS.', "THAT'S HOW KNEES WORK.", "IT'S A HANGOVER, KEVIN."],
  reassure: ['YOU SAY "THAT\'S NORMAL." THEY ALMOST BELIEVE YOU.', 'YOU NOD WITH DEEP, PROFOUND, FAKE CONCERN.',
    'YOU SAY "WE\'LL TAKE GOOD CARE OF YOU." A LIE. A BEAUTIFUL LIE.', 'YOU PAT THEIR SHOULDER. THEY FLINCH. IT\'S THE CLAWS.'],
  pamphlets: ['SO YOU HAVE A COLD', 'NOT EVERYTHING IS CANCER', 'PAIN: IT\'S A FEELING', 'THE ER IS NOT A HOTEL',
    'VIRUSES (CRAYON EDITION)', 'WAITING: A HOW-TO'],
  backfire: ['"I\'LL STICK WITH THE INTERNET." THE PAMPHLET BECOMES A COASTER.', 'THEY FOLD IT INTO A PAPER CRANE AND THROW IT AT YOU.',
    'THEY READ IT ALOUD. SLOWLY. WITH CORRECTIONS.'],
  pages: ['OVERHEAD: "DR. MALPHAS TO TRIAGE. DR. MALPHAS TO TRIAGE."', 'OVERHEAD: "DR. MALPHAS, YOU HAVE A... VISITOR."',
    'OVERHEAD: "CODE BEIGE. CODE BEIGE. SOMEONE IS MILDLY UPSET."', 'OVERHEAD: "DR. MALPHAS, LINE 6. IT\'S A COMPLAINT."'],
};

window.PATIENTS = [
  { id: 'steve', name: 'SNIFFLES STEVE', short: 'STEVE', cc: 'RUNNY NOSE X 20 MINUTES', hp: 22, weak: 'reassure', w: 3,
    look: { hair: 'short', eyes: 'tired', mouth: 'open', prop: 'tissues', extra: 'tissue' },
    chart: '38 Y/O M. VITALS PERFECT. HAS USED FOUR BOXES OF TISSUES IN THE LOBBY.',
    win: 'STEVE WAS DISCHARGED WITH ONE TISSUE AND A NEW SENSE OF PURPOSE.',
    attacks: [
      { t: 'MY NOSE HAS BEEN RUNNING FOR TWENTY WHOLE MINUTES.', s: 'san', d: 5 },
      { t: "I THINK IT'S MOVING TO MY CHEST. I CAN FEEL IT.", s: 'san', d: 6 },
      { t: 'CAN I GET AN MRI? JUST TO BE SAFE?', s: 'san', d: 7 },
      { t: '*SNIFF*... *SNIFF*... *SNIFFFFFFF*', s: 'san', d: 4 },
      { t: "MY MOM SAID YOU'D GIVE ME ANTIBIOTICS.", s: 'rsp', d: 6 },
    ] },
  { id: 'iris', name: 'INTERNET IRIS', short: 'IRIS', cc: 'SELF-DIAGNOSED: EVERYTHING', hp: 26, weak: 'hellfire', resist: 'pamphlet', w: 3,
    look: { hair: 'long', eyes: 'glasses', mouth: 'open', prop: 'phone' },
    chart: '34 Y/O F. 47 BROWSER TABS OPEN. ACTUAL PROBLEM: PAPER CUT. FEARS NOTHING ONLINE.',
    win: 'IRIS LEAVES TO WRITE A 3,000-WORD FORUM POST ABOUT YOU.',
    attacks: [
      { t: 'I LOOKED UP MY SYMPTOMS. I HAVE ALL OF THE CANCERS.', s: 'san', d: 7 },
      { t: 'MY PHONE SAYS THIS IS EITHER A SPRAIN OR LUPUS.', s: 'san', d: 6 },
      { t: 'I READ A FORUM POST FROM 2009. HAVE YOU?', s: 'rsp', d: 7 },
      { t: 'ARE YOU SURE? THE APP SAID 94% CHANCE OF DEATH.', s: 'san', d: 6 },
      { t: "I'D LIKE A SECOND OPINION. FROM THE INTERNET.", s: 'rsp', d: 8 },
    ] },
  { id: 'wendy', name: 'WORK NOTE WENDY', short: 'WENDY', cc: 'NEEDS NOTE FOR LAST TUESDAY', hp: 24, weak: 'worknote', w: 3,
    look: { hair: 'bun', eyes: 'dot', mouth: 'smile', prop: 'note' },
    chart: '26 Y/O F. NO COMPLAINTS. HAS A SHIFT AT 9 AM. DOES NOT WANT IT.',
    win: 'WENDY SKIPS OUT, CLUTCHING HER NOTE LIKE A DIPLOMA.',
    attacks: [
      { t: 'I FEEL TOTALLY FINE. I JUST NEED A NOTE.', s: 'rsp', d: 6 },
      { t: 'CAN YOU BACKDATE IT? LIKE, TO LAST TUESDAY?', s: 'rsp', d: 7 },
      { t: "AND ONE FOR MY BOYFRIEND. HE'S IN THE CAR.", s: 'rsp', d: 5, g: 4 },
      { t: "MAKE IT SAY 'STRICT BED REST UNTIL FRIDAY'.", s: 'san', d: 5 },
      { t: 'WAIT, WHY DO YOU HAVE TO EXAMINE ME?', s: 'san', d: 6 },
    ] },
  { id: 'frank', name: 'FREQUENT FRANK', short: 'FRANK', cc: '"THE USUAL"', hp: 30, weak: 'sandwich', noRun: true, w: 3,
    look: { hair: 'bald', eyes: 'tired', mouth: 'smile', extra: 'beard', hairC: 2, prop: 'bag' },
    chart: 'AGE UNKNOWN. 2,413 PRIOR VISITS. HAS HIS OWN PARKING SPOT AND A MUG.',
    win: 'FRANK WAVES GOODBYE. SEE YOU IN AN HOUR, FRANK.',
    attacks: [
      { t: "HEY DOC! IT'S ME, FRANK! FOURTH TIME TONIGHT!", s: 'san', d: 6 },
      { t: 'SAME THING AS LAST TIME. YOU KNOW. THE THING.', s: 'san', d: 6 },
      { t: 'CAN I GET THE GOOD BLANKET? THE WARM ONE?', s: 'rsp', d: 5 },
      { t: "I'M ALLERGIC TO EVERYTHING EXCEPT TURKEY SANDWICHES.", s: 'rsp', d: 7 },
      { t: "I'LL JUST SLEEP HERE. YOU WON'T EVEN KNOW I'M HERE.", s: 'san', d: 6, g: 5 },
    ] },
  { id: 'opal', name: 'ESSENTIAL OPAL', short: 'OPAL', cc: 'OILS STOPPED WORKING', hp: 26, weak: 'blanket', w: 3,
    look: { hair: 'long', hairC: 2, eyes: 'worried', mouth: 'flat', prop: 'oil' },
    chart: "41 Y/O F. SMELLS AGGRESSIVELY OF EUCALYPTUS. ALLERGIC TO 'CHEMICALS'. LOVES A COZY BLANKET.",
    win: 'OPAL LEAVES A TRAIL OF LAVENDER AND UNSOLICITED ADVICE.',
    attacks: [
      { t: 'I PUT LAVENDER ON IT. THEN I PUT MORE LAVENDER ON IT.', s: 'san', d: 6 },
      { t: "I DON'T BELIEVE IN MEDICINE. CAN I HAVE SOME MEDICINE?", s: 'san', d: 7 },
      { t: 'YOUR AURA IS VERY RED. AND VERY POINTY.', s: 'rsp', d: 6 },
      { t: 'HAVE YOU TRIED OILS FOR YOUR... CONDITION?', s: 'rsp', d: 8 },
      { t: 'CAN YOU DO THE IV WITHOUT A NEEDLE?', s: 'san', d: 6 },
    ] },
  { id: 'gary', name: 'SANDWICH GARY', short: 'GARY', cc: 'HUNGER', hp: 24, weak: 'sandwich', weakMult: 3, w: 3,
    look: { hair: 'cap', eyes: 'dot', mouth: 'open' },
    chart: "29 Y/O M. CHIEF COMPLAINT, VERBATIM: 'HUNGER.' VITALS: HUNGRY.",
    win: 'GARY LEAVES SATISFIED. FOR NOW. HE WILL BE HUNGRY AGAIN.',
    attacks: [
      { t: 'SO... DO YOU GUYS HAVE SANDWICHES?', s: 'san', d: 5 },
      { t: 'MY CHEST HURTS. ALSO, IS THERE A SANDWICH?', s: 'san', d: 6 },
      { t: 'THE GUY IN BAY 2 GOT A SANDWICH.', s: 'rsp', d: 6 },
      { t: 'TURKEY. NO MAYO. ACTUALLY, LIGHT MAYO. ACTUALLY...', s: 'rsp', d: 6 },
      { t: "I'LL WAIT. I'LL WAIT FOREVER.", s: 'san', d: 6, g: 4 },
    ] },
  { id: 'ted', name: '11/10 TED', short: 'TED', cc: 'PAIN 11/10 (EATING CHIPS)', hp: 26, weak: 'icechips', w: 3,
    look: { hair: 'spiky', eyes: 'angry', mouth: 'open', prop: 'chips' },
    chart: "33 Y/O M. ANKLE 'BROKEN'. ANKLE WALKED IN UNASSISTED. WILL ACCEPT ICE CHIPS.",
    win: 'TED HOBBLES OUT ON THE WRONG LEG. HE HAS LEFT CRUMBS EVERYWHERE.',
    attacks: [
      { t: 'MY PAIN IS AN ELEVEN. *CRUNCH*', s: 'san', d: 6 },
      { t: "OKAY NOW IT'S A TWELVE. *CRUNCH CRUNCH*", s: 'san', d: 7 },
      { t: "TYLENOL DOESN'T WORK. WHAT'S THE ONE THAT STARTS WITH 'D'?", s: 'rsp', d: 7 },
      { t: "I'M ALLERGIC TO EVERYTHING BUT THE GOOD STUFF.", s: 'rsp', d: 6 },
      { t: 'WHY ARE YOU LOOKING AT MY CHIPS?', s: 'san', d: 5 },
    ] },
  { id: 'sal', name: 'SKEPTICAL SAL', short: 'SAL', cc: 'WANTS A "REAL" DOCTOR', hp: 28, weak: 'hellfire', w: 3,
    look: { hair: 'short', hairC: 1, eyes: 'angry', mouth: 'frown', prop: 'cane' },
    chart: "78 Y/O M. HAS ASKED FOR 'A REAL DOCTOR' 14 TIMES. RESPECTS ONLY RAW POWER.",
    win: 'SAL ADMITS YOU ARE "PROBABLY A DOCTOR." HIGHEST HONOR HE GIVES.',
    attacks: [
      { t: 'ARE YOU A REAL DOCTOR? YOU LOOK TWELVE.', s: 'rsp', d: 8 },
      { t: 'ALSO, YOU HAVE HORNS. IS THAT ALLOWED?', s: 'rsp', d: 7 },
      { t: 'I WANT TO SPEAK TO YOUR MANAGER. (YOUR MANAGER IS SATAN.)', s: 'rsp', d: 7, g: 5 },
      { t: 'BACK IN MY DAY, DOCTORS HAD HALOS.', s: 'san', d: 6 },
      { t: "MY NEPHEW IS A NURSE. HE SAYS YOU'RE WRONG.", s: 'rsp', d: 7 },
    ] },
  { id: 'roz', name: 'REVIEWER ROZ', short: 'ROZ', cc: 'WAITED 4 MINUTES', hp: 36, weak: 'reassure', w: 1,
    look: { hair: 'bun', hairC: 2, eyes: 'shades', mouth: 'frown', prop: 'phone' },
    chart: '52 Y/O F. HAS REVIEWED THIS ER 47 TIMES. AVERAGE RATING: 1.0. CRAVES VALIDATION.',
    win: 'ROZ LEAVES. YOU WILL READ HER REVIEW AT 4 AM. IT WILL HURT.',
    attacks: [
      { t: "I'VE BEEN WAITING FOUR MINUTES. FOUR!", s: 'san', d: 7 },
      { t: "I'LL BE LEAVING A ONE-STAR REVIEW.", s: 'rsp', d: 10 },
      { t: "I'M RECORDING THIS FOR MY 12 FOLLOWERS.", s: 'rsp', d: 8 },
      { t: "WHY DOES HE GET SEEN FIRST? SURE, HE'S ON FIRE, BUT-", s: 'san', d: 8 },
      { t: 'IS THIS HOW YOU TREAT ALL YOUR CUSTOMERS?', s: 'rsp', d: 8, g: 5 },
    ] },
  { id: 'sam', name: 'SPLINTER SAM', short: 'SAM', cc: 'SPLINTER (VIA AMBULANCE)', hp: 22, weak: 'diagnose', w: 3,
    look: { hair: 'mohawk', eyes: 'worried', mouth: 'wavy', extra: 'bandage' },
    chart: '22 Y/O M. SPLINTER: 2 MM. AMBULANCE BILL: $3,400. NEEDS A CONFIDENT DIAGNOSIS.',
    win: 'SAM LEAVES ON FOOT. HE IS CALLING ANOTHER AMBULANCE TO GET HOME.',
    attacks: [
      { t: "I CALLED 911 BECAUSE IT'S A REALLY BIG SPLINTER.", s: 'san', d: 6 },
      { t: 'ALSO MY RIDE WAS GOING TO BE 20 MINUTES.', s: 'rsp', d: 6 },
      { t: 'CAN YOU GIVE ME ANESTHESIA? LIKE, THE FULL KIND?', s: 'san', d: 7 },
      { t: "DON'T TOUCH IT! OKAY, NOW TOUCH IT. NO, DON'T!", s: 'san', d: 7 },
      { t: "WILL I STILL BE ABLE TO PLAY PIANO? I CAN'T NOW, BUT-", s: 'san', d: 5 },
    ] },
  { id: 'chad', name: 'CHIN-MASK CHAD', short: 'CHAD', cc: "FEVER (DENIES FEVER)", hp: 26, weak: 'pamphlet', w: 3,
    look: { hair: 'short', hairC: 2, eyes: 'dot', mouth: 'smile', extra: 'mask' },
    chart: '31 Y/O M. TEMP: 103. DENIES FEVER. HAS NEVER READ A PAMPHLET. VULNERABLE TO ONE.',
    win: 'CHAD LEAVES, COUGHING ON THE DOOR HANDLE ON THE WAY OUT.',
    attacks: [
      { t: '*COUGHS DIRECTLY ON YOU* SORRY. *COUGHS AGAIN*', s: 'san', d: 7 },
      { t: "I DON'T NEED A TEST. I'M NOT SICK. I JUST HAVE A FEVER.", s: 'san', d: 6 },
      { t: "MY MASK? IT'S ON. ON MY CHIN. THAT COUNTS.", s: 'rsp', d: 6 },
      { t: "CAN YOU WRITE 'NOT CONTAGIOUS' ON MY NOTE?", s: 'rsp', d: 6 },
      { t: "MY WHOLE OFFICE HAS IT. ALSO MY KID'S DAYCARE.", s: 'san', d: 6 },
    ] },
];

// Build each patient's battle portrait once.
window.PATIENTS.forEach((p) => { p.sprite = SPR.makePatient(p.look); });

window.pickPatient = () => {
  const list = window.PATIENTS;
  let r = Math.random() * list.reduce((a, p) => a + p.w, 0);
  for (const p of list) { r -= p.w; if (r <= 0) return p; }
  return list[0];
};
