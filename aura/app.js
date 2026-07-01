// ── PERSISTENCE ────────────────────────────────────────────────
// All user state lives in one localStorage blob so it survives reloads.
var STORAGE_KEY = 'auraState';
var state = {
  role: 'musician',
  authed: false,
  onboarded: false,
  userGoals: {},      // per-role arrays of goals set via the modal
  userPitches: {},    // per-role arrays of logged pitches
  doneActs: {},       // per-role map of completed weekly priorities
  profile: null,      // {name, handle, bio, tags}
  prefs: {},          // settings toggles keyed by data-pref
  notifsRead: [],     // indexes of read notifications
  convExtra: {},      // messages sent per conversation id
  aiHistory: [],      // AI chat transcript [{role, content}]
  apiKey: ''          // Anthropic API key for Ask Aura (stored locally only)
};

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      for (var k in state) {
        if (parsed[k] !== undefined) state[k] = parsed[k];
      }
    }
  } catch (e) { /* corrupted blob — start fresh with defaults */ }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
loadState();

function escHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function profileName() {
  return (state.profile && state.profile.name) || 'María Castro';
}

// NAVIGATION
// Section → sidebar button mapping
var SECTION_OF = {
  weekly:'home', home:'home',
  dashboard:'insights', strategy:'insights',
  goals:'planning', planning:'planning',
  distribute:'studio', workspace:'studio',
  revenue:'money', ads:'money',
  collabs:'people', messages:'people', discover:'people',
  pitches:'people', pipeline:'people', opportunities:'people',
  cases:'ops', settings:'settings', profile:'settings'
};

function go(page, btn) {
  document.querySelectorAll('.page').forEach(function(p) {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  var t = document.getElementById('page-' + page);
  if (t) {
    t.style.display = (page === 'messages') ? 'flex' : 'block';
    t.classList.add('active');
  }
  // Sidebar: activate the section button
  document.querySelectorAll('.ni').forEach(function(n) { n.classList.remove('on'); });
  var section = SECTION_OF[page] || page;
  var snavBtn = document.getElementById('snav-' + section);
  if (snavBtn) snavBtn.classList.add('on');
  // Render functions
  if (page === 'dashboard') { buildChart(); renderGrowthScores(); renderIntelBrief(); }
  if (page === 'messages') initMsgs();
  if (page === 'goals') renderGoals();
  if (page === 'pitches') renderPitches();
  if (page === 'pipeline') renderPipeline();
  if (page === 'distribute') renderDistribute();
  if (page === 'ads') renderAds();
}

// NOTIFICATIONS
function toggleNotifs() {
  document.getElementById('npanel').classList.toggle('open');
  document.getElementById('nov').classList.toggle('open');
}
function closeNotifs() {
  document.getElementById('npanel').classList.remove('open');
  document.getElementById('nov').classList.remove('open');
}

// ROLE DATA
var ROLES = {
  musician: {
    label: 'Musician', distIcon: '🎵', distLabel: 'Distribute',
    name: 'María',
    stats: [{v:'12.4K',l:'Monthly streams',d:'↑ +8% vs last month',up:true},{v:'38.1K',l:'IG followers',d:'↑ +1,247 this month',up:true},{v:'$55',l:'Earned this month',d:'Next payout Jul 15',up:true}],
    discoveries: [
      {type:'opp',label:'Opportunity',head:'"Indie Chill" playlist closes in 3 days — 94% match for "Marea"',body:'210K followers, indie pop editorial. BPM, key, and mood match your track exactly. Submissions close Thursday at 11pm.',cta:'Pitch now',fn:"openModal('pitch')",src:'Detected via SubmitHub · 6h ago'},
      {type:'warn',label:'Warning',head:'TikTok preview muted on "Lluvia de Julio" — release in 18 days',body:'The intro segment (0:02–0:05) triggered an audio fingerprint match. The preview is muted in 14 countries. Fix needed before July 18.',cta:'View fix steps',fn:"openModal('case-tiktok')",src:'Detected via TikTok API · 4h ago'},
      {type:'insight',label:'Insight',head:'Streams up 8% this month — Bogotá is your fastest-growing city',body:'34% of new listeners came from Bogotá this week, up from 12% last month. Your audience there is growing 3× faster than Mexico City.',cta:'See full breakdown',fn:"go('dashboard',null)",src:'Spotify for Artists · Updated daily'},
      {type:'memory',label:'From your archive',head:'6 months ago: "Verano Roto" crossed 10,000 streams for the first time',body:'That release opened your first playlist placement. The strategy that worked: 3 pitches in the first 48 hours, TikTok teaser the week before.',cta:'See what worked',fn:"go('dashboard',null)",src:'Aura memory · December 2025'}
    ],
    window: {tag:'● Open window right now', body:'"Indie Chill" playlist (210K followers) accepting submissions until Thursday. "Marea" matches their BPM, key and genre exactly.',time:'⏱ Closes in 3 days'},
    acts: [
      {title:'Pitch "Marea" to 3 playlists before Thursday',badge:'b-r',badgeTxt:'Closes in 3 days',mgr:'"María, I\'ve already written the email — copy and send. 15 minutes."',stake:'One placement → <strong>8,000–15,000 new streams</strong> and <strong>$32–$60 in royalties</strong>.',ideas:['🎵 Behind-the-scenes of making "Marea" — process videos get 2× avg views','🎸 30-sec acoustic teaser — teasers get 1.8× saves','📖 "A song I wrote about..." — storytelling trending +40% this week'],btns:'<button class="btn pri" onclick="openModal(\'pitch\')">📋 Copy pitch email</button><button class="btn" onclick="openModal(\'playlists\')">🎵 See 3 playlists</button>',time:'15 minutes'},
      {title:'Post 2 TikToks — Tuesday and Thursday at 8pm',badge:'b-c',badgeTxt:'High impact',mgr:'"Your evening posts average 4,200 views vs 1,400 for midday. 3× the result, just timing."',stake:'Based on <strong>your actual data</strong>. Tuesday and Thursday 8pm are your peak hours — not anyone else\'s.',ideas:['🎵 Behind-the-scenes of making "Marea" — process videos get 2× avg views','🎸 30-sec acoustic teaser — teasers get 1.8× saves','📖 "A song I wrote about..." — storytelling trending +40% this week'],btns:'<button class="btn pri" onclick="openModal(\'calendar\')">📅 Content calendar</button>',time:'2–3 hours total'},
      {title:'Set up a call with Lucas Rivas this week',badge:'b-a',badgeTxt:'High potential',mgr:'"Lucas has a track that fits your sound, 94% audience match, he messaged 3 days ago — don\'t let this go cold."',stake:'Joint post could bring <strong>2,000–4,000 new real followers</strong> based on his <strong>34% real audience overlap</strong>.',ideas:[],btns:'<button class="btn pri" onclick="go(\'messages\',null);toast(\'Opening chat...\')">💬 Message Lucas</button><button class="btn" onclick="go(\'collabs\',null)">👤 His profile</button>',time:'5 minutes'}
    ],
    proj: [{now:'12.4K streams/mo',fut:'~28K',lbl:'Spotify streams'},{now:'84.2K followers',fut:'~90K',lbl:'Total followers'},{now:'~$48/mo royalties',fut:'~$112/mo',lbl:'Estimated royalties'}],
    metrics: [{l:'Total followers',v:'83.7K',d:'↑ +1,847 this week',up:true},{l:'Monthly streams',v:'12,381',d:'↑ +7.4% vs last month',up:true},{l:'Avg engagement',v:'6.3%',d:'↑ vs 3.2% industry avg',up:true},{l:'Reach rate',v:'29.4%',d:'↑ 4.7× average',up:true}]
  },
  producer: {
    label: 'Producer', distIcon: '🎚️', distLabel: 'Releases',
    name: 'Carlos',
    stats: [{v:'8',l:'Beats sold this month',d:'↑ +3 vs last month',up:true},{v:'$1,240',l:'Revenue this month',d:'Best month ever',up:true},{v:'2',l:'Sync pitches sent',d:'↓ Room to grow',up:false}],
    discoveries: [
      {type:'opp',label:'Opportunity',head:'Netflix sync brief closes Friday — "Calor" is a near-perfect match',body:'A Netflix-affiliated supervisor posted a brief for Afro-Latin vibes, 90–110 BPM. Your track hits 97 BPM and matches the mood description exactly. Fee: $2K–$8K.',cta:'See brief',fn:"openModal('pitch')",src:'Detected via sync network · 2h ago'},
      {type:'trend',label:'Trend',head:'"Afro-Latin instrumental" is up 67% on TikTok this month',body:'Your existing catalog already fits this trend — specifically "Calor" and "Urban Summer." Uploading short versions as TikTok sounds could drive organic placements.',cta:'Explore content angles',fn:"go('strategy',null)",src:'TikTok Creative Center · Updated weekly'},
      {type:'warn',label:'Warning',head:'Your catalog hasn\'t updated in 14 days',body:'Beat marketplaces deprioritize inactive catalogs. Discovery drops by 3× after 10 days without new uploads. You have 2 unreleased stems ready.',cta:'Go to Studio',fn:"go('distribute',null)",src:'BeatStars analytics · Detected today'},
      {type:'insight',label:'Insight',head:'Non-exclusive licenses are your highest-ROI product',body:'This month: 8 beats sold — 5 non-exclusive ($30–$50 each), 2 premium lease ($150 each), 1 exclusive ($2,000). Exclusives make up 78% of revenue from 12.5% of transactions.',cta:'See revenue breakdown',fn:"go('revenue',null)",src:'Aura revenue tracker · June 2026'}
    ],
    window: {tag:'● Sync brief open now', body:'Netflix-affiliated music supervisor posted a brief for Afro-Latin vibes, 90–110 BPM. Deadline Friday. Your beat "Calor" is a near-perfect match.',time:'⏱ Closes Friday'},
    acts: [
      {title:'Pitch "Calor" for the Netflix sync brief',badge:'b-r',badgeTxt:'Closes Friday',mgr:'"This is a $2K–$8K sync fee if it lands. I\'ve drafted the submission email — send it in 10 minutes."',stake:'Sync placements are <strong>the highest ROI move</strong> for producers. One placement pays more than 200 beat sales.',ideas:['🎬 Add a 60-sec edited version for trailer use','📝 Include stems + BPM/key in your submission','🎯 Address the supervisor by name — "Dear Sofia"'],btns:'<button class="btn pri" onclick="toast(\'Opening submission form...\')">📤 Submit to brief</button><button class="btn" onclick="toast(\'Preparing stems...\')">🎚️ Prep stems</button>',time:'20 minutes'},
      {title:'Upload 3 beats to BeatStars and tag properly',badge:'b-c',badgeTxt:'Easy win',mgr:'"Your last 3 beats are sitting in your DAW. Tagging them correctly gets 4× more discovery on marketplaces."',stake:'Proper mood + BPM + key tags → <strong>4× more organic discovery</strong> on BeatStars, Airbit and YouTube.',ideas:['🏷️ Add BPM, key, mood, and artist influence tags','📸 Custom thumbnail > 300% more clicks than generic','🎵 30-sec preview starting at the best part, not the intro'],btns:'<button class="btn pri" onclick="toast(\'Opening beat manager...\')">🎚️ Manage beats</button>',time:'45 minutes'},
      {title:'Send your catalog to 5 independent artists',badge:'b-a',badgeTxt:'High potential',mgr:'"Aura found 5 artists in your genre with 10K–80K followers who are actively looking for producers this month."',stake:'Exclusive deals with independent artists bring <strong>$300–$2,000 per project</strong> plus royalty splits.',ideas:['💬 Personalize each message with a specific beat in mind','🎯 Lead with "I made this with your sound in mind"','📊 Include your release track record in the message'],btns:'<button class="btn pri" onclick="go(\'collabs\',null)">🎯 See matched artists</button><button class="btn" onclick="go(\'messages\',null)">💬 Open messages</button>',time:'30 minutes'}
    ],
    proj: [{now:'8 beats/mo',fut:'~20',lbl:'Beats placed'},{now:'$1,240/mo',fut:'~$3,400',lbl:'Revenue'},{now:'0 syncs',fut:'1–2',lbl:'Sync deals'}],
    metrics: [{l:'Beats sold',v:'8',d:'↑ +3 this month',up:true},{l:'Revenue',v:'$1,284',d:'↑ Best month yet',up:true},{l:'Active licenses',v:'14',d:'3 exclusive deals',up:true},{l:'Avg beat price',v:'$160',d:'↑ +24% vs 90 days',up:true}]
  },
  director: {
    label: 'Director', distIcon: '📁', distLabel: 'Portfolio',
    name: 'Sofía',
    stats: [{v:'3',l:'Active projects',d:'All on schedule',up:true},{v:'$18K',l:'Pipeline value',d:'2 proposals pending',up:true},{v:'$8,400',l:'Revenue this month',d:'↑ +28% vs Q1',up:true}],
    discoveries: [
      {type:'warn',label:'Warning',head:'2 proposals have been unread for 5+ days',body:'The Cultura Mx brand proposal (sent Jun 24) and the Startup X social package (sent Jun 22) haven\'t been opened. Deals followed up close at 3× the rate.',cta:'Copy follow-up email',fn:"openModal('followup')",src:'CRM activity · Checked 1h ago'},
      {type:'opp',label:'Opportunity',head:'Q3 fashion brief posted — $12K–$20K, deadline Friday',body:'DTC brand (200K followers) seeking a creative director for their summer campaign. Your portfolio matches their visual reference. Budget confirmed. 3 directors applied so far.',cta:'See brief & apply',fn:"go('opportunities',null)",src:'Discovered via creative network · 3h ago'},
      {type:'insight',label:'Insight',head:'Your last campaign hit 3M views — the client hasn\'t heard from you in 3 weeks',body:'Band Tormenta MV is trending. This is the right moment to follow up for a referral, a case study post, or a repeat project pitch.',cta:'Open messages',fn:"go('messages',null)",src:'YouTube analytics · Aura monitoring'},
      {type:'memory',label:'From your archive',head:'This time last year you closed your first $5,000 project',body:'A local brand found you through a LinkedIn post about your process. You\'re now at $8,400/month. Your best-performing content has always been behind-the-scenes.',cta:'View your journey',fn:"go('dashboard',null)",src:'Aura memory · June 2025'}
    ],
    window: {tag:'● Client brief just posted', body:'DTC fashion brand (200K IG followers) posted a brief for a creative director for their Q3 campaign. Budget $12,000–$20,000. Deadline to apply: this Friday.',time:'⏱ Apply by Friday'},
    acts: [
      {title:'Follow up on 2 pending proposals today',badge:'b-r',badgeTxt:'5+ days no reply',mgr:'"Silence doesn\'t mean no. 80% of closed deals needed a follow-up. I\'ve drafted the email — send it now."',stake:'Proposals that get followed up close at <strong>3× the rate</strong> of those left on read.',ideas:['📧 One line: "Checking in — any questions about the proposal?"','📞 A voice note converts better than text for creative work','🤝 Offer a 15-min call to walk through the concept live'],btns:'<button class="btn pri" onclick="toast(\'Draft copied!\')">✉️ Copy follow-up email</button>',time:'10 minutes'},
      {title:'Apply to the Q3 fashion campaign brief',badge:'b-c',badgeTxt:'High budget',mgr:'"$12K–$20K budget, your portfolio matches their aesthetic. This is worth 2 hours of your time."',stake:'Landing one brand campaign covers <strong>2–3 months</strong> of operating costs for most independent directors.',ideas:['🎨 Lead with 3 references from their brand visual world','📽️ Include a 60-sec case study of your last similar project','💡 Propose the concept briefly in your first message'],btns:'<button class="btn pri" onclick="go(\'distribute\',null)">📁 Open portfolio</button><button class="btn" onclick="toast(\'Drafting brief response...\')">✏️ Draft response</button>',time:'2 hours'},
      {title:'Post a case study to LinkedIn and Instagram',badge:'b-a',badgeTxt:'Brand building',mgr:'"Your last campaign results are sitting in a Notion doc. Turn them into a post — it\'s your best sales tool."',stake:'Creative directors who share case studies get <strong>40% more inbound leads</strong> than those who don\'t.',ideas:['📊 Before / after: "The brand had X problem. Here\'s what we did."','🎬 3 frames from the final campaign as a carousel','📝 One line on budget + timeline shows you\'re professional'],btns:'<button class="btn pri" onclick="openModal(\'calendar\')">📅 Schedule posts</button>',time:'1 hour'}
    ],
    proj: [{now:'3 active projects',fut:'5–6',lbl:'Projects/month'},{now:'$18K pipeline',fut:'$35K+',lbl:'Monthly pipeline'},{now:'2 inbound/mo',fut:'6–8',lbl:'Inbound leads'}],
    metrics: [{l:'Active projects',v:'3',d:'All on schedule',up:true},{l:'Monthly revenue',v:'$8,400',d:'↑ +28% vs Q1',up:true},{l:'Pipeline value',v:'$18K',d:'2 proposals pending',up:true},{l:'Avg project',v:'$2,800',d:'↑ vs $1,900 last yr',up:true}]
  },
  photo: {
    label: 'Photographer', distIcon: '🖼️', distLabel: 'Portfolio',
    name: 'Diego',
    stats: [{v:'4.9K',l:'IG reach per post',d:'↑ Above average',up:true},{v:'1.2%',l:'Booking conversion',d:'↓ Industry avg is 3.1%',up:false},{v:'$3,450',l:'Revenue this month',d:'↑ +$920 vs last',up:true}],
    discoveries: [
      {type:'opp',label:'Opportunity',head:'Pitchfork-ES editorial open call — paid, deadline Sunday',body:'Music magazine seeking photographers for their October cover feature. Paid editorial, 400K readership. One editorial credit at this level typically doubles commercial inquiry rates.',cta:'See submission details',fn:"go('opportunities',null)",src:'Detected via editorial network · 4h ago'},
      {type:'insight',label:'Insight',head:'Reels get 6× more reach than your stills — you posted 1 Reel last week',body:'Your last Reel: 29,000 reach. Your last photo post: 4,800 reach. The gap is consistent. Posting 3 Reels per week based on your data would add ~80K monthly impressions.',cta:'See content plan',fn:"go('strategy',null)",src:'Instagram analytics · Updated today'},
      {type:'warn',label:'Warning',head:'1.2% booking conversion — the industry average is 3.1%',body:'Your Instagram reach is strong but your bio hasn\'t been updated in 4 months. A clear booking CTA and a link in bio is the single highest-impact fix available to you right now.',cta:'See what to change',fn:"go('strategy',null)",src:'Profile analysis · Detected this week'},
      {type:'trend',label:'Trend',head:'"Film grain" aesthetic is up 82% on Pinterest this month',body:'This matches your existing portfolio style. 3 photographers in your tier grew bookings by 40%+ by doubling down on this aesthetic during the trend window.',cta:'See trending content',fn:"go('strategy',null)",src:'Pinterest Trends · Updated weekly'}
    ],
    window: {tag:'● Editorial brief open', body:'Music magazine Pitchfork-ES posted an open call for photographer submissions for their October cover. Paid editorial. Deadline: Sunday.',time:'⏱ Closes Sunday'},
    acts: [
      {title:'Update your booking CTA on Instagram bio',badge:'b-r',badgeTxt:'Quick win',mgr:'"Right now your bio says \'DM for bookings.\' That\'s vague. I\'ve written a better version — replace it in 5 minutes."',stake:'"Book a session" link in bio → <strong>3.4× more inquiry clicks</strong> than asking people to DM.',ideas:['📸 Replace "DM for bookings" with "Book your session →" + link','🔗 Use a Linktree: portfolio, pricing, contact','📅 Add "Next availability: July 20" — scarcity drives action'],btns:'<button class="btn pri" onclick="toast(\'Bio text copied!\')">✏️ Copy bio text</button>',time:'5 minutes'},
      {title:'Submit to the Pitchfork-ES editorial open call',badge:'b-c',badgeTxt:'Paid + prestige',mgr:'"Editorial credits open doors to brand work. This one pays and puts your name in front of 400K readers."',stake:'One editorial credit can <strong>double your commercial rate</strong> and unlock brand inquiries.',ideas:['🖼️ Pick 5 images that match their dark, moody aesthetic','📝 Write a 2-sentence bio that highlights your music photography','🎯 Reference a Pitchfork-ES cover you admire in your pitch'],btns:'<button class="btn pri" onclick="go(\'distribute\',null)">🖼️ Open portfolio</button><button class="btn" onclick="toast(\'Drafting submission...\')">📤 Submit</button>',time:'1 hour'},
      {title:'Post 3 Reels this week — not just stills',badge:'b-a',badgeTxt:'Reach boost',mgr:'"Your Reels get 6× more reach than your photo posts. You only posted 1 last week. Let\'s fix that ratio."',stake:'Switching to 3 Reels/week → <strong>+40% reach</strong> based on your account data.',ideas:['🎬 Behind-the-scenes of a shoot in 30 seconds','⚡ Fast-cut "before / after" edit — always performs well','🎵 Your portfolio images set to a trending audio'],btns:'<button class="btn pri" onclick="openModal(\'calendar\')">📅 Content plan</button>',time:'3 hours total'}
    ],
    proj: [{now:'$3,200/mo booked',fut:'~$6,000',lbl:'Monthly revenue'},{now:'4 clients/mo',fut:'7–8',lbl:'Bookings/month'},{now:'1 editorial',fut:'3+',lbl:'Editorial credits'}],
    metrics: [{l:'IG reach/post',v:'4,917',d:'↑ Above average',up:true},{l:'Bookings/month',v:'4',d:'↑ +1 vs last month',up:true},{l:'Monthly revenue',v:'$3,450',d:'↑ +$920',up:true},{l:'Inquiry rate',v:'1.2%',d:'↓ Avg is 3.1%',up:false}]
  },
  video: {
    label: 'Videographer', distIcon: '🎬', distLabel: 'Portfolio',
    name: 'Andrés',
    stats: [{v:'28K',l:'YouTube Shorts views',d:'↑ +11K this week',up:true},{v:'0',l:'CTA clicks from videos',d:'No link in descriptions',up:false},{v:'$4,650',l:'Revenue this month',d:'↑ +$1,150 vs last',up:true}],
    discoveries: [
      {type:'opp',label:'Opportunity',head:'Sportswear brand RFP — $5K–$9K budget, closes Thursday',body:'Direct-to-consumer brand posted an open RFP for a 60-sec product video. 3 applications so far. Your most recent reel matches their reference aesthetic closely.',cta:'See RFP details',fn:"go('opportunities',null)",src:'Detected via brand network · 1h ago'},
      {type:'warn',label:'Warning',head:'14 YouTube Shorts — zero booking links in descriptions',body:'You\'re generating 28,000 views per month with no conversion path. Adding a single line ("Book a project →") to every description could drive 8–15 inquiries per month from people already watching your work.',cta:'See how to fix it',fn:"go('strategy',null)",src:'YouTube Studio · Detected today'},
      {type:'insight',label:'Insight',head:'Your last two brand deals both came from one YouTube case study',body:'The SportsCo case study (uploaded March 2026) drove 2 direct client inquiries. It\'s still getting views. You haven\'t made a case study since.',cta:'Plan your next one',fn:"go('distribute',null)",src:'Aura attribution tracking'},
      {type:'trend',label:'Trend',head:'Native LinkedIn video gets 5× more reach than YouTube links',body:'3 videographers in your tier gained 2–4 new monthly clients by repurposing their best YouTube content as native LinkedIn uploads. Takes 10 minutes per video.',cta:'See content strategy',fn:"go('strategy',null)",src:'LinkedIn analytics data · This week'}
    ],
    window: {tag:'● Brand RFP just posted', body:'Direct-to-consumer sportswear brand posted an RFP for a 60-sec product video. Budget: $5,000–$9,000. Submissions open until Thursday.',time:'⏱ RFP closes Thursday'},
    acts: [
      {title:'Add a booking link to every YouTube description',badge:'b-r',badgeTxt:'5 minutes',mgr:'"You have 14 YouTube Shorts with zero links in the description. Every one of those views is a lost lead."',stake:'Adding a link → <strong>8–15 inquiries/month</strong> from people already watching your work.',ideas:['🔗 "Want a video like this? Book a call →" in every description','📌 Pin a comment with your link on your top 3 Shorts','🎯 Use a booking page (Calendly) not just email'],btns:'<button class="btn pri" onclick="toast(\'Link template copied!\')">🔗 Copy link template</button>',time:'5 minutes'},
      {title:'Apply to the sportswear brand RFP',badge:'b-c',badgeTxt:'$5K–$9K budget',mgr:'"Brand work at this budget is your fastest path to $10K months. Your reel matches their energy. Apply now."',stake:'One $5K–$9K project per month = <strong>$60K–$108K annual revenue</strong> from brand work alone.',ideas:['🎬 Submit a 90-sec reel with only sports/lifestyle work','📊 Include 2 case studies with before/after metrics','💡 Propose a concept specific to their product in your pitch'],btns:'<button class="btn pri" onclick="go(\'distribute\',null)">🎬 Open showreel</button><button class="btn" onclick="toast(\'Drafting proposal...\')">✏️ Draft proposal</button>',time:'2 hours'},
      {title:'Turn your best project into a YouTube case study',badge:'b-a',badgeTxt:'Long-term asset',mgr:'"Your best client work is hidden from potential clients. One 3-min case study video is the best ad you\'ll ever run."',stake:'Video case studies get <strong>5× more inbound leads</strong> than static portfolio pages.',ideas:['🎥 Structure: Problem → Process → Result → Client quote','📊 Include real numbers if client allows (views, sales, ROI)','📲 Upload to YouTube + clip 30 seconds for TikTok/Reels'],btns:'<button class="btn pri" onclick="openModal(\'calendar\')">📅 Production plan</button>',time:'4–6 hours'}
    ],
    proj: [{now:'$4,800/mo',fut:'~$9,500',lbl:'Monthly revenue'},{now:'2 clients/mo',fut:'4–5',lbl:'Clients/month'},{now:'28K views/mo',fut:'80K+',lbl:'YT views/month'}],
    metrics: [{l:'YT views/month',v:'27.3K',d:'↑ +9.8K this week',up:true},{l:'Project revenue',v:'$4,650',d:'↑ +$1,150',up:true},{l:'Active clients',v:'2',d:'1 brand, 1 music',up:true},{l:'Avg project',v:'$2,325',d:'↑ vs $1,800 last yr',up:true}]
  }
};

var currentRole = ROLES[state.role] ? state.role : 'musician';
var doneActs = state.doneActs[currentRole] || {};

function setRole(role, btn) {
  currentRole = role;
  doneActs = state.doneActs[role] || {};
  state.role = role;
  saveState();
  syncRolePills();
  var r = ROLES[role];
  var di = document.getElementById('nav-dist-ic');
  var dl = document.getElementById('nav-dist-lbl');
  if (di) di.textContent = r.distIcon;
  if (dl) dl.textContent = r.distLabel;
  renderWeekly();
  renderDashMetrics();
  renderRevenue();
  toast('Switched to ' + r.label + ' view');
}

function renderWeekly() {
  var r = ROLES[currentRole];
  var d = new Date();
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var hrs = d.getHours();
  var greeting = hrs < 12 ? 'Good morning' : hrs < 17 ? 'Good afternoon' : 'Good evening';
  var dateStr = days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();

  // Discovery cards
  var discHTML = (r.discoveries || []).map(function(disc) {
    return '<div class="dc '+disc.type+'">'
      +'<div class="dc-left">'
      +'<div class="dc-type">'+disc.label+'</div>'
      +'<div class="dc-head">'+disc.head+'</div>'
      +'<div class="dc-body">'+disc.body+'</div>'
      +'<div class="dc-footer">'
      +'<button class="btn" style="font-size:12px;padding:5px 12px;" onclick="'+disc.fn+'">'+disc.cta+' →</button>'
      +'<span class="dc-src">'+disc.src+'</span>'
      +'</div>'
      +'</div>'
      +'</div>';
  }).join('');

  // Career pulse stats (3 cards)
  var pulseHTML = (r.stats || []).map(function(s) {
    return '<div class="pulse-stat">'
      +'<div class="pulse-v">'+s.v+'</div>'
      +'<div class="pulse-l">'+s.l+'</div>'
      +'<div class="pulse-d '+(s.up?'up':'dn')+'">'+s.d+'</div>'
      +'</div>';
  }).join('');

  // Priority actions (cleaner, no AI-persona quotes)
  var actsHTML = r.acts.map(function(act, i) {
    var ideasHTML = act.ideas.length ? '<div class="cbox" style="margin-left:38px;margin-bottom:10px;"><div style="font-size:11px;color:var(--t3);font-weight:600;text-transform:uppercase;margin-bottom:10px;">Content ideas from your data</div>'
      + act.ideas.map(function(idea) { return '<div class="idea" onclick="selIdea(this)">'+idea+'</div>'; }).join('')
      + '</div>' : '';
    var isDone = !!doneActs[i+1];
    return '<div class="hac'+(isDone?' done-act':'')+'" id="ac'+(i+1)+'">'
      +'<div class="hac-top">'
      +'<div class="hac-num" id="n'+(i+1)+'">'+(isDone?'✓':(i+1))+'</div>'
      +'<div class="hac-title">'+act.title+'<span class="badge '+act.badge+'" style="font-size:10px;margin-left:8px;">'+act.badgeTxt+'</span></div>'
      +'</div>'
      +'<div class="hac-ctx">'+act.stake+'</div>'
      + ideasHTML
      +'<div class="hac-tools">'+act.btns+'<button class="btn" onclick="markDone('+(i+1)+')">'+( isDone ? '✓ Done' : 'Mark done' )+'</button></div>'
      +'<div class="hac-time">⏱ '+act.time+'</div>'
      +'</div>';
  }).join('');

  document.getElementById('weekly-content').innerHTML =
    '<div class="home-hero">'
    +'<div class="home-date">'+dateStr+'</div>'
    +'<div class="home-name">'+greeting+', '+(r.name||'there')+'.</div>'
    +'<div class="home-found">Aura found '+(r.discoveries?r.discoveries.length:'0')+' things while you were away.</div>'
    +'</div>'
    +'<div class="disc-stack">'+discHTML+'</div>'
    +'<div class="home-section-lbl">Career pulse</div>'
    +'<div class="home-pulse">'+pulseHTML+'</div>'
    +'<div class="home-section-lbl">Your priorities this week</div>'
    +'<div class="home-acts">'+actsHTML+'</div>';
}

function renderDashMetrics() {
  var r = ROLES[currentRole];
  var el = document.getElementById('dash-metrics');
  if (!el) return;
  el.innerHTML = r.metrics.map(function(m) {
    return '<div class="mc"><div class="ml">'+m.l+'</div><div class="mv">'+m.v+'</div><div class="md '+(m.up?'up':'dn')+'">'+m.d+'</div></div>';
  }).join('');
  var dt = document.getElementById('dash-title');
  if (dt) dt.textContent = 'Insights';
  renderIntelBrief();
}

// Growth Scores — role-adaptive
var GSCORES = {
  musician:[
    {lbl:'Career health',val:74,fill:'var(--cyan)',trend:'+3 this week'},
    {lbl:'Growth score',val:70,fill:'var(--cyan)',trend:'Solid'},
    {lbl:'Release health',val:61,fill:'var(--amber)',trend:'2 issues'},
    {lbl:'Opportunity score',val:88,fill:'var(--green)',trend:'5 new today'},
    {lbl:'Momentum score',val:82,fill:'var(--green)',trend:'+11 pts'},
    {lbl:'Execution score',val:55,fill:'var(--amber)',trend:'3 actions pending'}
  ],
  producer:[
    {lbl:'Career health',val:68,fill:'var(--cyan)',trend:'+1 this week'},
    {lbl:'Growth score',val:62,fill:'var(--amber)',trend:'Steady'},
    {lbl:'Release health',val:80,fill:'var(--green)',trend:'All good'},
    {lbl:'Opportunity score',val:71,fill:'var(--cyan)',trend:'3 new today'},
    {lbl:'Momentum score',val:65,fill:'var(--cyan)',trend:'+4 pts'},
    {lbl:'Execution score',val:74,fill:'var(--cyan)',trend:'On track'}
  ],
  director:[
    {lbl:'Career health',val:79,fill:'var(--green)',trend:'+5 this week'},
    {lbl:'Growth score',val:75,fill:'var(--cyan)',trend:'Strong'},
    {lbl:'Release health',val:90,fill:'var(--green)',trend:'All good'},
    {lbl:'Opportunity score',val:66,fill:'var(--cyan)',trend:'2 new today'},
    {lbl:'Momentum score',val:71,fill:'var(--cyan)',trend:'+7 pts'},
    {lbl:'Execution score',val:83,fill:'var(--green)',trend:'Excellent'}
  ],
  photo:[
    {lbl:'Career health',val:63,fill:'var(--amber)',trend:'Needs attention'},
    {lbl:'Growth score',val:58,fill:'var(--amber)',trend:'Slow week'},
    {lbl:'Release health',val:95,fill:'var(--green)',trend:'All good'},
    {lbl:'Opportunity score',val:77,fill:'var(--cyan)',trend:'4 new today'},
    {lbl:'Momentum score',val:60,fill:'var(--amber)',trend:'+2 pts'},
    {lbl:'Execution score',val:48,fill:'var(--red)',trend:'4 unanswered'}
  ],
  video:[
    {lbl:'Career health',val:71,fill:'var(--cyan)',trend:'Stable'},
    {lbl:'Growth score',val:67,fill:'var(--cyan)',trend:'+2 pts'},
    {lbl:'Release health',val:85,fill:'var(--green)',trend:'All good'},
    {lbl:'Opportunity score',val:73,fill:'var(--cyan)',trend:'3 new today'},
    {lbl:'Momentum score',val:76,fill:'var(--cyan)',trend:'+8 pts'},
    {lbl:'Execution score',val:61,fill:'var(--amber)',trend:'2 pending'}
  ]
};
function renderGrowthScores() {
  var el = document.getElementById('growth-scores'); if(!el) return;
  var scores = GSCORES[currentRole] || GSCORES.musician;
  el.innerHTML = scores.map(function(s) {
    return '<div class="gscore">'
      +'<div class="gs-lbl">'+s.lbl+'</div>'
      +'<div class="gs-row">'
      +'<div class="gs-val" style="color:'+s.fill+'">'+s.val+'</div>'
      +'<div class="gs-bar"><div class="gs-fill" style="width:'+s.val+'%;background:'+s.fill+'"></div></div>'
      +'<div class="gs-trend" style="color:var(--t3)">'+s.trend+'</div>'
      +'</div></div>';
  }).join('');
}

// Intelligence Brief — what to do right now, role-adaptive
var INTEL = {
  musician:[
    {title:'Pitch "Marea" to editorial playlists — window closes Friday',why:'BPM and genre match 3 playlists with 240K combined reach. Highest-leverage action this week.',conf:'High confidence',impact:'+1,800–3,200 streams',effort:'15 min',cta:'Pitch now',fn:"openModal('pitch')"},
    {title:'Post on TikTok tonight between 7–9pm',why:'Evening posts average 4,200 views vs 1,400 daytime. Your audience peaks at 7:30pm.',conf:'Very high confidence',impact:'+2,800 avg views',effort:'0 min extra',cta:'Set reminder',fn:"toast('Reminder set for 7pm!')"}
  ],
  producer:[
    {title:'Upload 2 new beats — catalog hasn\'t updated in 14 days',why:'Catalogs updated weekly get 3.4× more license inquiries. You have 2 unreleased stems ready.',conf:'High confidence',impact:'+3.4× inquiries',effort:'30 min',cta:'Upload beats',fn:"go('distribute',null);toast('Opening releases...')"},
    {title:'Follow up with the 3 unanswered license requests',why:'Average response window is 48h. Two requests are from verified labels — delays cost deals.',conf:'High confidence',impact:'Est. $480+ revenue',effort:'10 min',cta:'Open inbox',fn:"go('messages',null)"}
  ],
  director:[
    {title:'Send the Volcom follow-up — it\'s been 4 days',why:'Your pipeline shows $8,400 stalled at "Proposal sent." One email recovers this deal.',conf:'High confidence',impact:'$8,400 deal',effort:'5 min',cta:'Open pipeline',fn:"go('pipeline',null)"},
    {title:'Update portfolio with the Marea music video',why:'Last update was 6 weeks ago. New work generates 2.3× more inbound.',conf:'Moderate confidence',impact:'+inbound inquiries',effort:'20 min',cta:'Update portfolio',fn:"go('profile',null)"}
  ],
  photo:[
    {title:'Respond to 4 open inquiries before they go cold',why:'Inquiry-to-booking rate drops 60% after 24 hours. All 4 arrived within the last 18h.',conf:'Very high confidence',impact:'Est. $1,120 bookings',effort:'20 min',cta:'Open pitches',fn:"go('pitches',null)"},
    {title:'Raise your rate — 28% below market for your tier',why:'Benchmark shows $350–$450/session for your follower count. You\'re at $280.',conf:'High confidence',impact:'+$70–$170/session',effort:'0 min',cta:'See benchmark',fn:"go('strategy',null)"}
  ],
  video:[
    {title:'Reach out to Patagonia\'s team before Jul 5',why:'Your reel matches their brief. Projects like this pay $2,400–$4,800.',conf:'Good match',impact:'Est. $2,400–$4,800',effort:'1–2 hrs',cta:'See opportunities',fn:"go('opportunities',null)"},
    {title:'YouTube hasn\'t posted in 11 days — momentum dropping',why:'Channels posting weekly grow 4× faster. One BTS clip keeps the algorithm warm.',conf:'High confidence',impact:'Recover −12% reach',effort:'45 min',cta:'Plan content',fn:"go('distribute',null)"}
  ]
};
function renderIntelBrief() {
  var el = document.getElementById('ib-actions'); if(!el) return;
  var actions = INTEL[currentRole] || INTEL.musician;
  el.innerHTML = actions.map(function(a, i) {
    return '<div class="ib-action">'
      +'<div class="ib-num">'+(i+1)+'</div>'
      +'<div class="ib-body">'
      +'<div class="ib-title">'+a.title+'</div>'
      +'<div class="ib-why">'+a.why+'</div>'
      +'<div class="brain-tags"><span class="btag btag-c">'+a.conf+'</span><span class="btag btag-i">'+a.impact+'</span><span class="btag btag-e">Effort: '+a.effort+'</span></div>'
      +'</div>'
      +'<div class="ib-cta"><button class="btn pri" style="white-space:nowrap;font-size:12px;" onclick="'+a.fn+'">'+a.cta+'</button></div>'
      +'</div>';
  }).join('');
}

// Init role on load
document.addEventListener('DOMContentLoaded', function() {
  renderWeekly();
  renderDashMetrics();
  renderGrowthScores();
  renderRevenue();
  renderIntelBrief();
  renderDiscGrid(ALL_CREATORS);
  document.getElementById('disc-count').textContent = ALL_CREATORS.length + ' creators found';
});

// WEEKLY helpers
function syncRolePills() {
  var map = {musician:'Musician',producer:'Producer',director:'Director',photo:'Photo',video:'Video'};
  document.querySelectorAll('.rp').forEach(function(b) {
    b.classList.toggle('on', b.textContent === map[currentRole]);
  });
}

function markDone(n) {
  if (doneActs[n]) return;
  doneActs[n] = true;
  state.doneActs[currentRole] = doneActs;
  saveState();
  var card = document.getElementById('ac' + n);
  var num = document.getElementById('n' + n);
  if (card) { card.classList.add('done-act'); }
  if (num) { num.textContent = '✓'; }
  var rem = 3 - Object.keys(doneActs).length;
  toast(rem === 0 ? '✓ All 3 done this week.' : rem + ' priorit' + (rem === 1 ? 'y' : 'ies') + ' remaining.');
}
function selIdea(el) {
  document.querySelectorAll('.idea').forEach(function(i) { i.classList.remove('sel'); });
  el.classList.add('sel');
  toast('Content idea selected!');
}

// ── GOALS ──────────────────────────────────────────────────────
var GOAL_DATA = {
  musician:[{type:'Monthly streams',cur:12381,target:50000,deadline:'Sep 30, 2026',pct:25},{type:'Total followers',cur:83714,target:100000,deadline:'Aug 15, 2026',pct:84}],
  producer:[{type:'Beats placed/mo',cur:8,target:20,deadline:'Sep 1, 2026',pct:40},{type:'Monthly revenue',cur:3742,target:8000,deadline:'Dec 31, 2026',pct:47}],
  director:[{type:'Monthly revenue',cur:8350,target:15000,deadline:'Oct 1, 2026',pct:56},{type:'Active clients',cur:3,target:8,deadline:'Dec 1, 2026',pct:38}],
  photo:[{type:'Bookings/month',cur:4,target:10,deadline:'Sep 1, 2026',pct:40},{type:'Monthly revenue',cur:3450,target:7000,deadline:'Oct 1, 2026',pct:49}],
  video:[{type:'Monthly revenue',cur:4650,target:10000,deadline:'Dec 31, 2026',pct:47},{type:'Brand clients',cur:2,target:6,deadline:'Nov 1, 2026',pct:33}]
};
function userGoalsFor(role) {
  if (!state.userGoals[role]) state.userGoals[role] = [];
  return state.userGoals[role];
}
function renderGoals() {
  var el = document.getElementById('goals-content'); if(!el) return;
  var t = document.getElementById('goals-title');
  if(t) t.textContent = ROLES[currentRole].label+' Goals';
  var base = GOAL_DATA[currentRole]||[];
  var all = base.concat(userGoalsFor(currentRole));
  if(!all.length){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)">No goals yet. Set your first goal →</div>';return;}
  // Primary goal hero
  var g = all[0];
  var pct = Math.round(g.pct);
  el.innerHTML = '<div class="goal-hero">'
    +'<div class="goal-top"><div><div style="font-size:18px;font-weight:700;">'+g.type+'</div><div class="goal-meta">Target: <strong style="color:var(--t1)">'+g.target.toLocaleString()+'</strong> by '+g.deadline+'</div></div>'
    +'<div style="text-align:right"><div style="font-size:32px;font-weight:700;color:var(--cyan)">'+pct+'%</div><div style="font-size:12px;color:var(--t3)">of goal</div></div></div>'
    +'<div class="goal-prog-wrap"><div class="goal-prog-bar"><div class="goal-prog-fill" style="width:'+pct+'%"></div></div>'
    +'<div class="goal-prog-labels"><span>'+g.cur.toLocaleString()+' now</span><span>'+g.target.toLocaleString()+' goal</span></div></div>'
    +'<div class="traj-grid">'
    +'<div class="traj-box"><div class="traj-v" style="color:var(--amber)">6.2 mo</div><div class="traj-l">At current pace</div></div>'
    +'<div class="traj-box"><div class="traj-v" style="color:var(--cyan)">3.8 mo</div><div class="traj-l">With Aura actions</div></div>'
    +'<div class="traj-box"><div class="traj-v up">+'+Math.round((g.target-g.cur)*0.03).toLocaleString()+'</div><div class="traj-l">Needed this week</div></div>'
    +'</div></div>'
    +'<div class="goal-list" style="margin-top:14px;">'
    + all.slice(1).map(function(g2){
      var p2=Math.round(g2.pct||Math.round((g2.cur/g2.target)*100));
      return '<div class="goal-card"><div class="goal-card-top"><div style="font-size:14px;font-weight:600;">'+g2.type+'</div><span class="goal-type">'+p2+'%</span></div>'
        +'<div class="goal-prog-bar" style="height:7px;margin-bottom:6px;"><div class="goal-prog-fill" style="width:'+p2+'%"></div></div>'
        +'<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);"><span>'+(g2.cur||'—').toLocaleString()+' → '+(g2.target||'—').toLocaleString()+'</span><span>By '+g2.deadline+'</span></div>'
        +'</div>';
    }).join('')
    +'</div>';
}
function fmtDate(d) {
  if(!d) return 'Dec 31, 2026';
  var parts = d.split('-'); if(parts.length < 3) return d;
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(parts[1])-1]+' '+parseInt(parts[2])+', '+parts[0];
}
function addGoal() {
  var type = document.getElementById('goal-type').value;
  var target = parseInt((document.getElementById('goal-target').value||'').replace(/,/g,''))||0;
  var deadline = fmtDate(document.getElementById('goal-deadline').value);
  if(!target){toast('Enter a target number first.');return;}
  userGoalsFor(currentRole).push({type:type,cur:0,target:target,deadline:deadline,pct:0});
  saveState();
  closeModal('newgoal');
  renderGoals();
  toast('Goal set! Aura will track your progress weekly.');
}

// ── PITCHES ────────────────────────────────────────────────────
var PITCH_DATA = {
  musician:[
    {target:'Indie Chill',type:'Playlist',work:'Marea',sent:'Jun 28',status:'followup'},
    {target:'Tarde de Sábado',type:'Playlist',work:'Marea',sent:'Jun 27',status:'viewed'},
    {target:'Ones to Watch — Pitchfork ES',type:'Music blog',work:'EP upcoming',sent:'Jun 20',status:'declined'},
    {target:'Guitar & Soul',type:'Playlist',work:'Marea',sent:'Jun 15',status:'placed'},
    {target:'Sofia Méndez — Netflix Music',type:'Sync supervisor',work:'Verano Roto',sent:'Jun 10',status:'sent'},
    {target:'Indie por Siempre',type:'Playlist',work:'Sin Señal',sent:'May 30',status:'placed'}
  ],
  producer:[
    {target:'Netflix Music — Sofia Méndez',type:'Sync supervisor',work:'Calor',sent:'Jun 28',status:'followup'},
    {target:'BeatStars Editorial',type:'Beat marketplace',work:'La Noche',sent:'Jun 20',status:'viewed'},
    {target:'Trap Nation',type:'Playlist',work:'Dark Room',sent:'Jun 10',status:'sent'},
    {target:'Universal Latin — A&R',type:'Label',work:'Full catalog',sent:'Jun 1',status:'declined'},
    {target:'Sofar Sounds MX',type:'Sync brief',work:'Morning Ritual',sent:'May 28',status:'placed'}
  ],
  director:[
    {target:'Nike Latam — Marketing',type:'Brand',work:'Concept deck',sent:'Jun 25',status:'followup'},
    {target:'FashionWeek MX',type:'Festival',work:'Portfolio',sent:'Jun 18',status:'viewed'},
    {target:'Vogue Latam',type:'Magazine',work:'Editorial concept',sent:'Jun 10',status:'sent'},
    {target:'Adidas Latin',type:'Brand',work:'Campaign deck',sent:'Jun 1',status:'placed'},
    {target:'MTV Latam',type:'Brand',work:'Show pitch',sent:'May 20',status:'declined'}
  ],
  photo:[
    {target:'Pitchfork ES',type:'Magazine',work:'Portfolio',sent:'Jun 28',status:'followup'},
    {target:'Rolling Stone Latam',type:'Magazine',work:'Concert series',sent:'Jun 20',status:'viewed'},
    {target:'Nike — Content team',type:'Brand',work:'Lifestyle portfolio',sent:'Jun 15',status:'sent'},
    {target:'Sounds and Colours',type:'Music blog',work:'Artist portraits',sent:'Jun 1',status:'placed'},
    {target:'Adobe Stock',type:'Licensing',work:'Batch 1 (200 photos)',sent:'May 15',status:'placed'}
  ],
  video:[
    {target:'SportsCo — Marketing',type:'Brand',work:'Brand video proposal',sent:'Jun 27',status:'followup'},
    {target:'YouTube Originals LA',type:'Platform',work:'Documentary pitch',sent:'Jun 20',status:'viewed'},
    {target:'Heineken Latam',type:'Brand',work:'Social video deck',sent:'Jun 10',status:'sent'},
    {target:'Vevo',type:'Platform',work:'Music video — Marea',sent:'Jun 5',status:'placed'},
    {target:'Amazon Prime',type:'Sync',work:'Showreel',sent:'May 20',status:'declined'}
  ]
};
function userPitchesFor(role) {
  if (!state.userPitches[role]) state.userPitches[role] = [];
  return state.userPitches[role];
}
var pitchFilter = 'all';
function renderPitches() {
  var t = document.getElementById('pitches-title');
  var sub = document.getElementById('pitches-sub');
  var labels = {musician:'Playlists · Blogs · Sync supervisors',producer:'Beat marketplaces · Sync supervisors · Labels',director:'Brands · Magazines · Festivals',photo:'Magazines · Brands · Licensing',video:'Brands · Platforms · Sync'};
  if(t) t.textContent = ROLES[currentRole].label+' Pitch Tracker';
  if(sub) sub.textContent = labels[currentRole]||'';
  filterPitches(pitchFilter, null);
}
function filterPitches(f, btn) {
  pitchFilter = f;
  if(btn){document.querySelectorAll('.pitch-col-btn').forEach(function(b){b.classList.remove('on');});btn.classList.add('on');}
  var all = (PITCH_DATA[currentRole]||[]).concat(userPitchesFor(currentRole));
  var rows = f==='all' ? all : all.filter(function(p){return p.status===f;});
  var statusLabel={sent:'Sent',viewed:'Viewed',placed:'✓ Placed',declined:'Declined',followup:'⚡ Follow up'};
  var statusCls={sent:'ps-sent',viewed:'ps-viewed',placed:'ps-placed',declined:'ps-declined',followup:'ps-followup'};
  var dotCls={sent:'pd-sent',viewed:'pd-viewed',placed:'pd-placed',declined:'pd-declined',followup:'pd-followup'};
  var tbody = document.getElementById('pitch-tbody'); if(!tbody) return;
  tbody.innerHTML = rows.map(function(p){
    var fu = p.status==='followup'||p.status==='viewed';
    return '<tr>'
      +'<td style="font-weight:600;color:var(--t1)">'+escHTML(p.target)+'</td>'
      +'<td><span class="ctag">'+escHTML(p.type)+'</span></td>'
      +'<td>'+escHTML(p.work)+'</td>'
      +'<td style="color:var(--t3)">'+escHTML(p.sent)+'</td>'
      +'<td><span class="'+statusCls[p.status]+'"><span class="pitch-dot '+dotCls[p.status]+'"></span>'+statusLabel[p.status]+'</span></td>'
      +'<td>'+(fu?'<button class="btn" style="padding:3px 9px;font-size:11px;" onclick="openFollowUp(\''+p.target.replace(/['"\\]/g,'')+'\',\''+p.work.replace(/['"\\]/g,'')+'\')">⚡ Follow up</button>':'')+'</td>'
      +'</tr>';
  }).join('');
}
function addPitch() {
  var target=document.getElementById('np-target').value.trim();
  var type=document.getElementById('np-type').value;
  var work=document.getElementById('np-work').value.trim();
  if(!target||!work){toast('Fill in all fields.');return;}
  userPitchesFor(currentRole).push({target:target,type:type,work:work,sent:'Today',status:'sent'});
  saveState();
  closeModal('newpitch');
  filterPitches(pitchFilter,null);
  toast('Pitch logged!');
}
function openFollowUp(target, work) {
  var r = ROLES[currentRole];
  var name = profileName();
  var templates = {
    musician: 'Subject: Following up — "'+work+'" for consideration\n\nHi '+target+' team,\n\nI sent you "'+work+'" a few days ago and wanted to follow up to make sure it reached you.\n\n"'+work+'" has been getting strong engagement — streaming +18% week over week — and I think it could be a great fit for your listeners.\n\nI\'d love any feedback you can share, even if it\'s not the right time.\n\nThank you for your time,\n'+name,
    producer: 'Hi '+target+',\n\nJust following up on "'+work+'" I sent over. It\'s been getting strong response from artists I\'ve shown it to.\n\nHappy to send a different version, a full pack, or jump on a quick call.\n\nBest,\n'+name,
    director: 'Hi '+target+' team,\n\nFollowing up on my proposal for "'+work+'" I sent a few days ago.\n\nI\'m flexible on scope and timing — happy to jump on a 15-min call to see if there\'s a fit.\n\nBest,\n'+name,
    photo: 'Hi '+target+',\n\nJust wanted to follow up on the portfolio I sent for "'+work+'".\n\nI have open dates in July and would love to work together if the timing works on your end.\n\nBest,\n'+name,
    video: 'Hi '+target+' team,\n\nFollowing up on my proposal for "'+work+'" — wanted to make sure it arrived and check if you have any questions.\n\nHappy to put together a quick mood board or revised scope if that helps.\n\nBest,\n'+name
  };
  var t = document.getElementById('fu-title');
  var b = document.getElementById('fu-body');
  if(t) t.textContent = '⚡ Follow-up — '+target;
  if(b) b.value = templates[currentRole]||templates.musician;
  openModal('followup');
}

// ── PIPELINE ───────────────────────────────────────────────────
var PIPELINE = {
  musician:{title:'Release Pipeline',sub:'Your upcoming releases',cols:['Idea','In production','Submitted','Live'],cards:[
    [{title:'Lluvia de Julio',sub:'Next single',val:'Jul 18',due:'Release date'},{title:'EP Vol.2',sub:'4 tracks concept',val:'Q4 2026',due:'Planning'}],
    [{title:'Sin Señal remix',sub:'Collab w/ Lucas',val:'In mix',due:'ETA: Jul 5'}],
    [{title:'Sin Señal',sub:'Official single',val:'Processing',due:'Est. live Jul 10'}],
    [{title:'Marea',sub:'Single',val:'6,240 streams',due:'Live Jun 1'},{title:'Verano Roto',sub:'Single',val:'3,180 streams',due:'Live Mar 14'}]
  ]},
  producer:{title:'Beat & Project Pipeline',sub:'Active work and upcoming',cols:['Idea','In production','Sent to client','Closed'],cards:[
    [{title:'Midnight Groove',sub:'Trap beat 140bpm',val:'—',due:'Started Jun 28'},{title:'Sol Oscuro',sub:'Reggaeton',val:'—',due:'Concept phase'}],
    [{title:'Urban Summer pack',sub:'5-beat bundle',val:'3/5 done',due:'ETA Jul 8'}],
    [{title:'Exclusive — Artist X',sub:'Full production deal',val:'$1,800',due:'Awaiting reply'}],
    [{title:'Calor sync',sub:'TV Commercial',val:'$2,000',due:'Paid ✓'},{title:'Dark Room exclusive',sub:'Artist Juana',val:'$270',due:'Paid ✓'}]
  ]},
  director:{title:'Project Pipeline',sub:'From prospect to delivered',cols:['Prospect','Proposal out','Active','Delivered'],cards:[
    [{title:'FashionCo campaign',sub:'Q3 brand',val:'$4,500',due:'Proposal sent Jun 18'},{title:'MTV Latam show',sub:'Creative direction',val:'$8K+',due:'Interest confirmed'}],
    [{title:'FashionCo',sub:'Q3 campaign',val:'$4,500',due:'Pending approval'}],
    [{title:'Nike Latam',sub:'Campaign in production',val:'$5,000',due:'Deadline Jul 15'},{title:'Startup X retainer',sub:'Monthly',val:'$2,000',due:'Jul 31'}],
    [{title:'Band Tormenta MV',sub:'Music video',val:'$1,400',due:'Delivered Jun 20 ✓'}]
  ]},
  photo:{title:'Booking Pipeline',sub:'Sessions and projects',cols:['Inquiry','Confirmed','Shooting','Delivered'],cards:[
    [{title:'Couple session',sub:'Portrait — CDMX',val:'$300',due:'Interested Jul 12'},{title:'Brand Zoe',sub:'Lifestyle campaign',val:'$1,800',due:'Quote sent'}],
    [{title:'Ana García',sub:'Portrait session',val:'$300',due:'Jul 3 confirmed'},{title:'Magazine X',sub:'Editorial shoot',val:'$400',due:'Jul 15 confirmed'}],
    [{title:'Carlos M.',sub:'Artist portrait',val:'$300',due:'Shooting Jul 21'}],
    [{title:'Brand Aurelia',sub:'Commercial',val:'$1,200',due:'Delivered Jun 25 ✓'}]
  ]},
  video:{title:'Project Pipeline',sub:'Brand videos, social content, films',cols:['Prospect','Proposal','In production','Delivered'],cards:[
    [{title:'Heineken Latam',sub:'Social content pack',val:'$3,200',due:'Proposal pending'},{title:'Startup Y',sub:'3-min brand video',val:'$2,800',due:'Discovery call Jul 5'}],
    [{title:'SportsCo 3-min video',sub:'Brand campaign',val:'$2,800',due:'Invoice sent'}],
    [{title:'Band Marea MV',sub:'Music video',val:'$1,800',due:'Edit phase · Jul 10'}],
    [{title:'Startup X social pack',sub:'8 Reels',val:'$1,200',due:'Delivered Jun 20 ✓'}]
  ]}
};
function renderPipeline() {
  var el=document.getElementById('pipeline-content'); if(!el) return;
  var pt=document.getElementById('pipe-title');
  var ps=document.getElementById('pipe-sub');
  var pl=document.getElementById('nav-pipe-lbl');
  var d=PIPELINE[currentRole]||PIPELINE.musician;
  if(pt) pt.textContent=d.title;
  if(ps) ps.textContent=d.sub;
  if(pl) pl.textContent=d.title.split(' ')[0];
  el.style.display='grid';
  el.style.gridTemplateColumns='repeat('+d.cols.length+',1fr)';
  el.style.gap='12px';
  el.innerHTML=d.cols.map(function(col,i){
    var cards=d.cards[i]||[];
    return '<div class="pipe-col">'
      +'<div class="pipe-col-hdr">'+col+'<span class="pipe-count">'+cards.length+'</span></div>'
      +cards.map(function(c){
        return '<div class="pipe-card" onclick="openPipeDetail(\''+c.title+'\',\''+c.sub+'\',\''+c.val+'\',\''+c.due+'\')">'
          +'<div class="pipe-title">'+c.title+'</div>'
          +'<div class="pipe-sub">'+c.sub+'</div>'
          +'<div class="pipe-foot"><span class="pipe-val">'+c.val+'</span><span class="pipe-due">'+c.due+'</span></div>'
          +'</div>';
      }).join('')
      +'<div class="pipe-card" style="border-style:dashed;opacity:.5;text-align:center;color:var(--t3);" onclick="openModal(\'add-pipe\')">+ Add</div>'
      +'</div>';
  }).join('');
  populatePipeStages();
}

function populatePipeStages() {
  var sel = document.getElementById('add-pipe-stage');
  if (!sel) return;
  var d = PIPELINE[currentRole] || PIPELINE.musician;
  sel.innerHTML = '';
  d.cols.forEach(function(c) {
    var o = document.createElement('option');
    o.textContent = c;
    sel.appendChild(o);
  });
}

// ── BENCHMARK ──────────────────────────────────────────────────
var BENCH = {
  musician:[{l:'Monthly streams',you:'12.4K',avg:'4.8K',win:true,vs:'2.6× above avg'},{l:'Engagement rate',you:'6.8%',avg:'3.2%',win:true,vs:'2.1× above avg'},{l:'Playlist placements',you:'2',avg:'0.8',win:true,vs:'Above avg'}],
  producer:[{l:'Monthly beat sales',you:'8',avg:'3.2',win:true,vs:'2.5× above avg'},{l:'Avg price / beat',you:'$155',avg:'$95',win:true,vs:'+63% vs avg'},{l:'Sync placements',you:'1',avg:'0.2',win:true,vs:'5× above avg'}],
  director:[{l:'Avg project value',you:'$2,800',avg:'$1,400',win:true,vs:'2× above avg'},{l:'Clients/month',you:'3',avg:'1.8',win:true,vs:'Above avg'},{l:'Retainer ratio',you:'33%',avg:'12%',win:true,vs:'Strong'}],
  photo:[{l:'Bookings/month',you:'4',avg:'5.2',win:false,vs:'-23% below avg'},{l:'Inquiry rate',you:'1.2%',avg:'3.1%',win:false,vs:'-61% below avg'},{l:'Avg session rate',you:'$300',avg:'$340',win:false,vs:'Below market'}],
  video:[{l:'Monthly revenue',you:'$4,800',avg:'$3,100',win:true,vs:'+55% above avg'},{l:'Avg project',you:'$2,400',avg:'$1,600',win:true,vs:'+50% above avg'},{l:'Brand client ratio',you:'50%',avg:'30%',win:true,vs:'Strong mix'}]
};
function renderBenchmark() {
  var el=document.getElementById('bench-grid'); if(!el) return;
  var bt=document.getElementById('bench-title');
  if(bt) bt.textContent='How you compare · '+ROLES[currentRole].label+' niche benchmark';
  var b=BENCH[currentRole]||[];
  el.innerHTML=b.map(function(item){
    return '<div class="bench-card">'
      +'<div class="bench-lbl">'+item.l+'</div>'
      +'<div class="bench-you">'+item.you+'</div>'
      +'<div class="bench-avg">Niche avg: '+item.avg+'</div>'
      +'<div class="bench-vs '+(item.win?'win':'lose')+'">'+item.vs+'</div>'
      +'</div>';
  }).join('');
}

// ── CONTENT REPURPOSER ─────────────────────────────────────────
var REPURPOSE = {
  musician:[
    {plat:'📸 Instagram Reels',tip:'Cut the first 3 seconds — TikTok hooks feel slow on Reels. Add the track name as a text overlay at 0:02. Use your best visual frame as thumbnail.',changes:['Trim intro -3s','Add track name overlay','Square crop (1:1)','Remove TikTok watermark']},
    {plat:'▶️ YouTube Shorts',tip:'Add a title card at the start: "If you like X you\'ll like this." YouTube Shorts viewers don\'t know you — give context. Keep it under 55 seconds.',changes:['Add title card','Caption for silent viewing','Tags: #indiemusic #newmusic','End screen: subscribe']},
    {plat:'🐦 Twitter / X',tip:'Post the audio as a voice tweet with the lyric that\'s getting comments as the caption. Engagement on audio clips is 3× text-only.',changes:['Extract best lyric','Native video upload','No hashtags — kills reach','Post 9am or 6pm']}
  ],
  producer:[
    {plat:'📸 Instagram Reels',tip:'Your BeatStars link in bio. Show the DAW screen in the background — producers get 40% more profile visits when they show the process.',changes:['DAW visible in shot','BPM/key in caption','Tag artists who might use this','Remove "no tags" watermark']},
    {plat:'▶️ YouTube',tip:'Post as a full YouTube video (not Short) with "FREE BEAT" in the title. Free beat downloads get 10× views and convert to premium buyers.',changes:['Title: "[FREE BEAT]..."','Description: download link','Add timestamp chapters','Tag: BPM, key, mood']},
    {plat:'🎵 TikTok',tip:'Film yourself reacting to the beat for the first time — candid reactions outperform polished promos 4:1 for producers.',changes:['Reaction format','Show your face','"I made this in 2 hours" caption','Trending audio in background']}
  ],
  director:[
    {plat:'💼 LinkedIn',tip:'Case study format: "Brief → Concept → Final." 3 slides. LinkedIn carousels on creative work get 5× more reach than single images. End with the result in numbers.',changes:['Carousel: 3-5 slides','Slide 1: the problem','Last slide: result + CTA','Tag the brand (with permission)']},
    {plat:'📸 Instagram',tip:'Behind-the-scenes is your best content — it shows your process, not just the outcome. Directors who share BTS get 3× more inbound inquiries.',changes:['BTS photo or clip','Caption: "The brief was..."','Tag collaborators','Save to "Work" highlight']},
    {plat:'🐦 Twitter / X',tip:'"Thread: how we concepted the [Brand] campaign." Threads about creative process get shared by other directors and seen by brands. 5 tweets is enough.',changes:['Thread format (5 tweets)','Tweet 1: hook + result','Include the final film','End with open DMs']}
  ],
  photo:[
    {plat:'📸 Instagram Reels',tip:'Before/after slider or fast-cut from raw to edited. BTS videos for photographers convert to bookings at 4× the rate of portfolio posts.',changes:['Before/After format','Show editing process','"Available for sessions" caption','Booking link in bio']},
    {plat:'📌 Pinterest',tip:'Pin your best 5 images to a board titled "[City] Portrait Photographer." Pinterest has 90-day SEO value per pin — it keeps driving traffic.',changes:['High-res export','Board: "[City] + style"','Alt text with location keywords','Link to your booking page']},
    {plat:'▶️ YouTube Shorts',tip:'"60 seconds, one portrait" — full edit from setup to final in 60 seconds. Photography Shorts are viral right now and undersaturated.',changes:['60-second time lapse','Show gear briefly','End: "DM for bookings"','Thumbnail: final portrait']}
  ],
  video:[
    {plat:'📸 Instagram Reels',tip:'30-second cut of your best brand video. Don\'t show the full video — tease it. "Full film in bio." Gets 3× more profile visits than showing everything.',changes:['30s teaser cut','Text: "Full film in bio"','Square or vertical crop','Client logo visible']},
    {plat:'▶️ YouTube',tip:'Post the full video as a YouTube video (not Short) titled "Brand video for [Client] — behind the scenes." Search traffic from "brand video [city]" converts to clients.',changes:['Full version upload','Title: brand + city','Description: what you offer','Add to "Brand work" playlist']},
    {plat:'💼 LinkedIn',tip:'"We delivered [X] in [Y] days for [Brand]." Post the video native to LinkedIn (not YouTube link). Native video gets 5× more reach on LinkedIn.',changes:['Native video upload (no YT link)','Caption: results first','Tag the brand','Post Tuesday or Wednesday']}
  ]
};
function renderRepurpose() {
  var el=document.getElementById('repurpose-content'); if(!el) return;
  var d=REPURPOSE[currentRole]||REPURPOSE.musician;
  el.innerHTML=d.map(function(r){
    var tags=r.changes.map(function(c){return '<span class="rep-change">'+c+'</span>';}).join('');
    return '<div class="rep-card">'
      +'<div class="rep-plat"><span style="font-size:16px;">'+r.plat.split(' ')[0]+'</span><span style="font-size:14px;font-weight:600;">'+r.plat.substring(2)+'</span></div>'
      +'<div class="rep-tip">'+r.tip+'</div>'
      +'<div class="rep-changes">'+tags+'</div>'
      +'</div>';
  }).join('');
}

// ── A/B TESTS ──────────────────────────────────────────────────
var AB_DATA = {
  musician:[
    {a:'🎵 "Made this at 2am when I couldn\'t sleep" caption',b:'"New song out now — link in bio"',metric:'Saves rate',result_a:'8.4%',result_b:'2.1%',winner:'a',delta:'+300%'},
    {a:'Post at 8pm Tuesday',b:'Post at 12pm Tuesday',metric:'Avg views',result_a:'4,200',result_b:'1,380',winner:'a',delta:'+204%'}
  ],
  producer:[
    {a:'"Free beat — type your artist name"',b:'"New beat available — DM for price"',metric:'Comments',result_a:'142',result_b:'18',winner:'a',delta:'+689%'},
    {a:'DAW visible in background',b:'Beat playing over static image',metric:'Profile visits',result_a:'840',result_b:'210',winner:'a',delta:'+300%'}
  ],
  director:[
    {a:'Post case study with numbers ("$40K campaign")',b:'Post without mentioning budget',metric:'DMs received',result_a:'12',result_b:'3',winner:'a',delta:'+300%'},
    {a:'Tag the brand in post',b:'Don\'t tag brand',metric:'Reach',result_a:'8,400',result_b:'2,100',winner:'a',delta:'+300%'}
  ],
  photo:[
    {a:'Before/after Reel (BTS)',b:'Final portrait only',metric:'Profile visits',result_a:'680',result_b:'180',winner:'a',delta:'+278%'},
    {a:'"Book your session — link in bio"',b:'"DM me for bookings"',metric:'Booking inquiries',result_a:'8',result_b:'2',winner:'a',delta:'+300%'}
  ],
  video:[
    {a:'30s teaser with "Full film in bio"',b:'Post full video on Reels',metric:'Bio clicks',result_a:'210',result_b:'40',winner:'a',delta:'+425%'},
    {a:'Native video on LinkedIn',b:'YouTube link on LinkedIn',metric:'Reach',result_a:'12,400',result_b:'2,100',winner:'a',delta:'+490%'}
  ]
};
function renderAB() {
  var el=document.getElementById('ab-content'); if(!el) return;
  var d=AB_DATA[currentRole]||[];
  el.innerHTML=d.map(function(t){
    return '<div class="ab-card">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
      +'<div style="font-size:12px;color:var(--t3);font-weight:600;text-transform:uppercase;">Testing: '+t.metric+'</div>'
      +'<span style="font-size:12px;font-weight:700;color:var(--green);">'+t.winner.toUpperCase()+' wins · '+t.delta+'</span>'
      +'</div>'
      +'<div class="ab-vs">'
      +'<div class="ab-side'+(t.winner==='a'?' winner':'')+'"><div style="font-size:10px;font-weight:700;color:var(--t3);margin-bottom:4px;">VERSION A</div>'+t.a+'<div class="ab-r" style="margin-top:8px;"><div class="ab-rv">'+t.result_a+'</div><div class="ab-rl">'+t.metric+'</div></div></div>'
      +'<div class="ab-mid">VS</div>'
      +'<div class="ab-side'+(t.winner==='b'?' winner':'')+'"><div style="font-size:10px;font-weight:700;color:var(--t3);margin-bottom:4px;">VERSION B</div>'+t.b+'<div class="ab-r" style="margin-top:8px;"><div class="ab-rv">'+t.result_b+'</div><div class="ab-rl">'+t.metric+'</div></div></div>'
      +'</div>'
      +'</div>';
  }).join('');
}

// ── COLLAB ROI ─────────────────────────────────────────────────
var CROI_DATA = {
  musician:[
    {name:'Lucas Rivas',ini:'LR',bg:'rgba(0,201,141,.1)',col:'#00C98D',type:'Joint post',when:'May 2026',stats:[{v:'+2,840',l:'New followers'},{v:'+4,100',l:'New streams'},{v:'94%',l:'Match score'},{v:'✓ Worth it',l:'Verdict'}]},
    {name:'Ale Vargas',ini:'AV',bg:'rgba(99,102,241,.1)',col:'#818CF8',type:'Story shoutout',when:'Apr 2026',stats:[{v:'+420',l:'New followers'},{v:'+610',l:'New streams'},{v:'71%',l:'Match score'},{v:'⚠ Weak ROI',l:'Verdict'}]}
  ],
  producer:[
    {name:'Juana López',ini:'JL',bg:'rgba(59,139,255,.1)',col:'#3B8BFF',type:'Production deal',when:'Jun 2026',stats:[{v:'$1,800',l:'Revenue'},{v:'3 tracks',l:'Produced'},{v:'✓ Published',l:'Status'},{v:'✓ Worth it',l:'Verdict'}]},
    {name:'DJ Marco',ini:'DM',bg:'rgba(245,166,35,.1)',col:'#F5A623',type:'Beat placement',when:'May 2026',stats:[{v:'$40',l:'Revenue'},{v:'12K',l:'Streams'},{v:'Non-excl.',l:'License'},{v:'⚠ Low value',l:'Verdict'}]}
  ],
  director:[
    {name:'Nike Latam',ini:'NK',bg:'rgba(0,201,141,.1)',col:'#00C98D',type:'Campaign direction',when:'Jun 2026',stats:[{v:'$5,000',l:'Fee'},{v:'2 referrals',l:'Generated'},{v:'+$8K',l:'Pipeline opened'},{v:'✓ Top client',l:'Verdict'}]},
    {name:'Startup Y',ini:'SY',bg:'rgba(255,91,91,.1)',col:'#FF5B5B',type:'Social content',when:'Mar 2026',stats:[{v:'$800',l:'Fee'},{v:'0 referrals',l:'Generated'},{v:'3 revisions',l:'Extra work'},{v:'⚠ Underpriced',l:'Verdict'}]}
  ],
  photo:[
    {name:'Band Tormenta',ini:'BT',bg:'rgba(99,102,241,.1)',col:'#818CF8',type:'Press photos',when:'Jun 2026',stats:[{v:'$600',l:'Revenue'},{v:'2 referrals',l:'Generated'},{v:'Editorial',l:'Usage right'},{v:'✓ Worth it',l:'Verdict'}]},
    {name:'Solo client',ini:'RC',bg:'rgba(245,166,35,.1)',col:'#F5A623',type:'Portrait session',when:'May 2026',stats:[{v:'$300',l:'Revenue'},{v:'0 referrals',l:'Generated'},{v:'3 hrs',l:'Total time'},{v:'⚠ Low/hr',l:'Verdict'}]}
  ],
  video:[
    {name:'SportsCo',ini:'SC',bg:'rgba(0,201,141,.1)',col:'#00C98D',type:'Brand video',when:'Jun 2026',stats:[{v:'$2,800',l:'Revenue'},{v:'1 referral',l:'Generated'},{v:'+$3.2K',l:'New pipeline'},{v:'✓ Top client',l:'Verdict'}]},
    {name:'Band local',ini:'BL',bg:'rgba(59,139,255,.1)',col:'#3B8BFF',type:'Music video',when:'Apr 2026',stats:[{v:'$800',l:'Revenue'},{v:'0 referrals',l:'Generated'},{v:'Portfolio',l:'Value'},{v:'⚠ Below rate',l:'Verdict'}]}
  ]
};
function renderCollabROI() {
  var el=document.getElementById('croi-content'); if(!el) return;
  var d=CROI_DATA[currentRole]||[];
  el.innerHTML=d.map(function(c){
    return '<div class="croi-card">'
      +'<div class="croi-head"><div class="dc-av" style="background:'+c.bg+';color:'+c.col+'">'+c.ini+'</div>'
      +'<div><div style="font-size:14px;font-weight:600;">'+c.name+'</div><div style="font-size:12px;color:var(--t3);">'+c.type+' · '+c.when+'</div></div></div>'
      +'<div class="croi-stats">'+c.stats.map(function(s){
        var isWin=s.v.indexOf('✓')>=0||s.v.indexOf('+')>=0&&s.v.indexOf('$')>=0;
        var isWarn=s.v.indexOf('⚠')>=0;
        return '<div class="croi-stat"><div class="croi-sv" style="'+(isWin?'color:var(--green)':isWarn?'color:var(--amber)':'')+'">'+s.v+'</div><div class="croi-sl">'+s.l+'</div></div>';
      }).join('')+'</div>'
      +'</div>';
  }).join('');
}

// ── EPK ────────────────────────────────────────────────────────
function renderEPK() {
  var el=document.getElementById('epk-preview'); if(!el) return;
  var t=document.getElementById('epk-title'); if(t) t.textContent='📋 '+ROLES[currentRole].label+' Press Kit';
  var d=ROLES[currentRole];
  var m=BENCH[currentRole]||[];
  el.innerHTML='<div class="epk-header">'
    +'<div class="uav" style="width:60px;height:60px;font-size:20px;">MC</div>'
    +'<div><div style="font-size:20px;font-weight:700;">María Castro</div>'
    +'<div style="font-size:13px;color:var(--t3);margin-top:2px;">'+d.label+' · Mexico City · @mariacastro</div>'
    +'<div style="font-size:12px;color:var(--t2);margin-top:4px;line-height:1.5;">Independent '+d.label.toLowerCase()+' and visual creator based in Mexico City. Open to collaborations with artists who care about the craft.</div></div></div>'
    +'<div class="epk-stats-row">'+(m.slice(0,4).map(function(item){return '<div class="epk-stat"><div class="epk-sv">'+item.you+'</div><div class="epk-sl">'+item.l+'</div></div>';}).join(''))+'</div>'
    +'<div style="font-size:12px;color:var(--t2);line-height:1.6;"><strong style="color:var(--t1);">Links:</strong> aura.app/mariacastro · spotify.com/artist/mariacastro · instagram.com/mariacastro<br>'
    +'<strong style="color:var(--t1);">Contact:</strong> mariacastro@aura.app · +52 55 1234 5678<br>'
    +'<strong style="color:var(--t1);">Press quotes:</strong> "One of the most promising voices in indie Latinoamérica" — Guitar & Soul</div>';
}

// Hook into setRole and DOMContentLoaded
var _origSetRole = setRole;
setRole = function(role, btn) {
  _origSetRole(role, btn);
  renderGoals(); renderPitches(); renderPipeline();
  renderBenchmark(); renderRepurpose(); renderAB(); renderCollabROI();
  renderDistribute(); renderAds();
  renderGrowthScores(); renderIntelBrief();
};

document.addEventListener('DOMContentLoaded', function() {
  renderGoals(); renderPitches(); renderPipeline();
  renderBenchmark(); renderRepurpose(); renderAB(); renderCollabROI();
  renderDistribute(); renderAds();
});

// ── ADS ROLE RENDER ──────────────────────────────────────────
var ADS_REC = {
  musician: {emoji:'🎵',post:'"Behind Marea" clip',stats:'14,200 organic views · 8.4% engagement',why:'Your best performing post this month. Boosting proven content costs 40% less per result.',budget:'$50',dur:'7 days',plat:'TikTok + Meta',sub:'ROI measured in streams and followers'},
  producer: {emoji:'🎵',post:'"Urban Summer Pack" reel',stats:'8,400 organic views · 6.2% engagement',why:'Beat showcase videos with DAW visible get 3× more DMs. Boost this to reach artists.',budget:'$40',dur:'5 days',plat:'TikTok + Meta',sub:'ROI measured in beat sales and DMs'},
  director: {emoji:'🎬',post:'Nike Latam campaign reel',stats:'3,200 organic reach · 9.1% engagement',why:'Case study content attracts brand clients. Boosting to a brand-manager audience gets inbound.',budget:'$80',dur:'10 days',plat:'LinkedIn + Meta',sub:'ROI measured in inbound inquiries'},
  photo: {emoji:'📸',post:'Before/after portrait Reel',stats:'4,600 organic views · 7.3% engagement',why:'Before/after content converts to bookings at 4× the rate of portfolio-only posts.',budget:'$30',dur:'7 days',plat:'Instagram',sub:'ROI measured in booking inquiries'},
  video: {emoji:'🎥',post:'SportsCo 30s teaser',stats:'5,800 organic views · 8.8% engagement',why:'Teaser + "full film in bio" drives profile visits. Brand audience targeting on LinkedIn.',budget:'$60',dur:'7 days',plat:'LinkedIn + Meta',sub:'ROI measured in project inquiries'}
};
function renderAds() {
  var sub = document.getElementById('ads-sub');
  var rec = document.getElementById('ads-rec');
  var d = ADS_REC[currentRole]||ADS_REC.musician;
  if(sub) sub.textContent = 'AI-powered · '+d.sub;
  if(rec) rec.innerHTML = '<div class="ai-label">Recommended campaign</div>'
    +'<div class="ai-rc"><div>'
    +'<div class="app"><div class="appi">'+d.emoji+'</div><div><div style="font-size:13px;font-weight:600;">'+d.plat.split('+')[0].trim()+' — '+d.post+'</div><div style="font-size:12px;color:var(--t2);margin-top:2px;">'+d.stats+'</div><div style="font-size:12px;color:var(--cyan);margin-top:2px;">Your best performing post this month</div></div></div>'
    +'<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;"><span class="expill">Budget: <strong>'+d.budget+'</strong></span><span class="expill">Duration: <strong>'+d.dur+'</strong></span><span class="expill">Platforms: <strong>'+d.plat+'</strong></span></div>'
    +'</div><div><div style="font-size:13px;color:var(--t2);line-height:1.6;">'+d.why+'</div>'
    +'<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">'
    +'<button class="btn pri" onclick="openModal(\'campaign\')">🚀 Launch this campaign</button>'
    +'<button class="btn" onclick="go(\'strategy\',null)">Choose different post</button>'
    +'</div></div></div>';
}

// ── REVENUE DATA ──────────────────────────────────────────────
var REVENUE = {
  musician: {
    total: '$62.40', period: 'June 2026', next: 'Next payout: July 15 · $62.40 pending',
    payout: {icon:'🏦', label:'Aura Pay · Direct deposit', detail:'Threshold: $10 · Pays on 15th of each month'},
    sources: [
      {icon:'🎵', plat:'Spotify', val:'$31.20', det:'6,240 streams × $0.005'},
      {icon:'🍎', plat:'Apple Music', val:'$18.40', det:'1,820 streams × $0.010'},
      {icon:'🎶', plat:'TikTok Sound', val:'$12.80', det:'4,200 uses × $0.003'},
      {icon:'📦', plat:'Amazon Music', val:'$0', det:'Awaiting first payout'},
    ],
    bars: [{l:'Spotify',pct:50,v:'$31.20'},{l:'Apple Music',pct:29,v:'$18.40'},{l:'TikTok',pct:20,v:'$12.80'}],
    table: {title:'Sync license pipeline', cols:['Song','Status','Potential'], rows:[['Marea','Pitch sent','$800–$2,000'],['Verano Roto','Not pitched','$400–$1,200']]}
  },
  producer: {
    total: '$3,740', period: 'June 2026', next: 'Next payout: July 1 · $3,740 ready',
    payout: {icon:'💳', label:'PayPal · Instant transfer', detail:'Threshold: $50 · Available on demand'},
    sources: [
      {icon:'🎚️', plat:'Beat sales (non-excl.)', val:'$480', det:'12 leases × $40 avg'},
      {icon:'⭐', plat:'Beat sales (exclusive)', val:'$620', det:'2 exclusives × $310 avg'},
      {icon:'🎬', plat:'Sync placement', val:'$2,000', det:'1 license · TV commercial'},
      {icon:'🤝', plat:'Project fees', val:'$640', det:'2 mix & master projects'},
    ],
    bars: [{l:'Sync license',pct:54,v:'$2,000'},{l:'Exclusive beats',pct:17,v:'$620'},{l:'Non-excl. leases',pct:13,v:'$480'},{l:'Project fees',pct:17,v:'$640'}],
    table: {title:'Beat sales this month', cols:['Beat','Type','Amount'], rows:[['La Noche','Non-exclusive','$40'],['Fuego 2026','Exclusive','$350'],['Chill Sunset','Non-exclusive','$40'],['Dark Room','Exclusive','$270'],['Morning Ritual','Non-exclusive','$40']]}
  },
  director: {
    total: '$8,400', period: 'June 2026', next: 'Pending invoice: $4,500 · Due July 10',
    payout: {icon:'🏦', label:'Wire transfer · Net-30 terms', detail:'2 invoices sent · 1 pending approval'},
    sources: [
      {icon:'👟', plat:'Nike Latam campaign', val:'$5,000', det:'Paid · Invoice #INV-0041'},
      {icon:'🔁', plat:'Startup X retainer', val:'$2,000', det:'Monthly · Auto-renews Aug 1'},
      {icon:'🎬', plat:'Music video dir.', val:'$1,400', det:'Paid · Invoice #INV-0039'},
      {icon:'⏳', plat:'Pending: FashionCo', val:'$4,500', det:'Awaiting client approval'},
    ],
    bars: [{l:'Nike campaign',pct:60,v:'$5,000'},{l:'Retainer',pct:24,v:'$2,000'},{l:'Music video',pct:17,v:'$1,400'}],
    table: {title:'Invoice tracker', cols:['Client','Amount','Status'], rows:[['Nike Latam','$5,000','Paid ✓'],['Startup X','$2,000','Paid ✓'],['Band "Tormenta"','$1,400','Paid ✓'],['FashionCo','$4,500','Pending'],['Startup Y','$3,000','Draft']]}
  },
  photo: {
    total: '$3,580', period: 'June 2026', next: 'Next session: July 3 · 2 bookings confirmed',
    payout: {icon:'💳', label:'Stripe · Instant payout', detail:'Deposits collected upfront · Balance: $3,580'},
    sources: [
      {icon:'👤', plat:'Portrait sessions', val:'$1,800', det:'6 sessions × $300'},
      {icon:'🏢', plat:'Commercial session', val:'$1,200', det:'1 brand shoot · Half-day'},
      {icon:'📰', plat:'Editorial (paid)', val:'$400', det:'1 magazine placement'},
      {icon:'🖼️', plat:'Print licensing', val:'$180', det:'3 prints × $60 avg'},
    ],
    bars: [{l:'Portrait sessions',pct:50,v:'$1,800'},{l:'Commercial',pct:34,v:'$1,200'},{l:'Editorial',pct:11,v:'$400'},{l:'Licensing',pct:5,v:'$180'}],
    table: {title:'Upcoming bookings', cols:['Client','Type','Date'], rows:[['Ana García','Portrait','Jul 3'],['Brand: Zoe','Commercial','Jul 8'],['Magazine X','Editorial','Jul 15'],['Carlos M.','Portrait','Jul 21']]}
  },
  video: {
    total: '$4,800', period: 'June 2026', next: 'Invoice due: $2,800 · July 5',
    payout: {icon:'🏦', label:'Wire transfer · Net-15 terms', detail:'YouTube AdSense: $380 pending · Pays Jul 21'},
    sources: [
      {icon:'👟', plat:'Brand video (3 min)', val:'$2,800', det:'Sportswear campaign · Due Jul 5'},
      {icon:'📱', plat:'Social content pack', val:'$1,200', det:'8 Reels · Monthly retainer'},
      {icon:'▶️', plat:'YouTube AdSense', val:'$380', det:'28K views × $0.014 RPM'},
      {icon:'📄', plat:'Footage licensing', val:'$420', det:'2 clips licensed to brands'},
    ],
    bars: [{l:'Brand video',pct:58,v:'$2,800'},{l:'Retainer',pct:25,v:'$1,200'},{l:'Licensing',pct:9,v:'$420'},{l:'AdSense',pct:8,v:'$380'}],
    table: {title:'Project tracker', cols:['Project','Client','Status'], rows:[['Brand Video 3min','SportsCo','Invoice sent'],['Social Pack Jun','Startup X','Paid ✓'],['Music Video','Band "Marea"','In edit'],['YT Shorts x4','Personal','Published']]}
  }
};

function renderRevenue() {
  var r = REVENUE[currentRole];
  var el = document.getElementById('rev-content');
  if (!el) return;
  var dt = document.getElementById('rev-title');
  if (dt) dt.textContent = ROLES[currentRole].label + ' Revenue';

  var srcHTML = r.sources.map(function(s) {
    return '<div class="rs-card"><div class="rs-icon">'+s.icon+'</div><div class="rs-plat">'+s.plat+'</div><div class="rs-val">'+s.val+'</div><div class="rs-det">'+s.det+'</div></div>';
  }).join('');

  var barHTML = r.bars.map(function(b) {
    return '<div class="rev-bar-row"><div class="rbl">'+b.l+'</div><div class="rbt"><div class="rbf" style="width:'+b.pct+'%"></div></div><div class="rbv">'+b.v+'</div></div>';
  }).join('');

  var tblHTML = r.table.rows.map(function(row) {
    var last = row[2];
    var isGood = last.indexOf('Paid') >= 0 || last.indexOf('✓') >= 0 || last.indexOf('Published') >= 0;
    var isPend = last.indexOf('Pending') >= 0 || last.indexOf('pending') >= 0 || last.indexOf('Invoice') >= 0 || last.indexOf('sent') >= 0;
    var cls = isGood ? 'inv-paid' : isPend ? 'inv-due' : 'inv-pen';
    return '<div class="inv-card">'
      +'<div style="flex:1"><div style="font-size:13px;font-weight:600;">'+row[0]+'</div><div class="inv-num">'+row[1]+'</div></div>'
      +'<span class="inv-st '+cls+'">'+last+'</span>'
      +'</div>';
  }).join('');

  var REV_INSIGHT = {
    musician:{title:'Sync licensing is your highest-margin channel — and it\'s untapped',why:'Your catalog has 4 tracks with strong sync potential. Average sync fee for your tier: $800–$2,400 per placement. One placement covers 2 months of streaming income.',cta:'Open pitches',fn:"go('pitches',null)"},
    producer:{title:'3 of your beats have expired non-exclusive licenses — renew or re-license',why:'Licenses older than 12 months without renewal are leaving revenue on the table. Re-licensing averages $240 each.',cta:'View licenses',fn:"go('pipeline',null)"},
    director:{title:'Your day rate is 18% below market for your reel quality and experience tier',why:'Benchmark data shows directors with comparable reels charge $2,800–$3,500/day. You\'re at $2,350. One rate adjustment = +$1,800 on next project.',cta:'See benchmark',fn:"go('strategy',null)"},
    photo:{title:'You\'re leaving $1,100/month on the table by not offering packages',why:'Photographers who bundle sessions + prints + digital delivery charge 2.4× more per client. Your current session rate is per-hour only.',cta:'View revenue tips',fn:"go('strategy',null)"},
    video:{title:'Brand content is paying 3× more than music videos right now — shift the pitch',why:'Your last 2 brand projects averaged $4,650 vs $1,600 per music video. One more brand client = +$3,000/month.',cta:'Open pitches',fn:"go('pitches',null)"}
  };
  var ins = REV_INSIGHT[currentRole] || REV_INSIGHT.musician;
  var insHTML = '<div class="intel-brief" style="margin-bottom:14px;">'
    +'<div class="ib-label">Best move for revenue right now</div>'
    +'<div class="ib-action" style="background:var(--s2);">'
    +'<div class="ib-num" style="background:var(--gs);border:1px solid var(--green);color:var(--green);">↑</div>'
    +'<div class="ib-body"><div class="ib-title">'+ins.title+'</div><div class="ib-why">'+ins.why+'</div></div>'
    +'<div class="ib-cta"><button class="btn pri" style="white-space:nowrap;font-size:12px;" onclick="'+ins.fn+'">'+ins.cta+'</button></div>'
    +'</div></div>';

  el.innerHTML = insHTML
    +'<div class="rev-total">'
    +'<div><div class="rev-big">'+r.total+'</div><div class="rev-sub">Total earned · '+r.period+'</div><div class="rev-next">'+r.next+'</div></div>'
    +'<div style="margin-left:auto;text-align:right;"><button class="btn pri" onclick="openModal(\'upgrade\')">Upgrade plan</button></div>'
    +'</div>'
    +'<div class="payout-bar"><div class="po-icon">'+r.payout.icon+'</div><div><div style="font-size:14px;font-weight:600;">'+r.payout.label+'</div><div style="font-size:12px;color:var(--t3);margin-top:2px;">'+r.payout.detail+'</div></div><button class="btn" style="margin-left:auto;" onclick="openModal(\'payout-report\')">Request payout</button></div>'
    +'<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin-bottom:14px;">'
    +'<div class="card"><div class="ctitle">Sources breakdown</div><div class="rev-streams">'+srcHTML+'</div></div>'
    +'<div class="card"><div class="ctitle">Revenue split</div>'+barHTML+'</div>'
    +'</div>'
    +'<div class="card"><div class="ctitle">'+r.table.title+'</div>'+tblHTML+'</div>';
}

// ── DISCOVER DATA ───────────────────────────────────────────────
var ALL_CREATORS = [
  {ini:'LR',bg:'rgba(0,201,141,.1)',col:'#00C98D',name:'Lucas Rivas',role:'Musician',city:'Mexico City',match:94,followers:'67K',eng:'7.2%',niche:'Indie pop',tags:['Guitar','Lo-fi','Singer-song.'],size:'mid'},
  {ini:'SP',bg:'rgba(59,139,255,.1)',col:'#3B8BFF',name:'Sara Pinto',role:'Illustrator',city:'Bogotá',match:88,followers:'41K',eng:'12%',niche:'Editorial art',tags:['Music covers','Poster art'],size:'mid'},
  {ini:'DM',bg:'rgba(245,166,35,.1)',col:'#F5A623',name:'Diego Mora',role:'Photographer',city:'Buenos Aires',match:76,followers:'22K',eng:'9.4%',niche:'Artist portraits',tags:['Concert','Lifestyle'],size:'micro'},
  {ini:'AV',bg:'rgba(99,102,241,.1)',col:'#818CF8',name:'Ale Vargas',role:'Videographer',city:'Monterrey',match:71,followers:'95K',eng:'6.8%',niche:'Music videos',tags:['Short films','Reels'],size:'macro'},
  {ini:'CF',bg:'rgba(255,91,91,.1)',col:'#FF5B5B',name:'Carlos Fuentes',role:'Producer',city:'Miami',match:85,followers:'18K',eng:'11%',niche:'Reggaeton trap',tags:['Beats','Mixing'],size:'micro'},
  {ini:'ML',bg:'rgba(59,139,255,.1)',col:'#3B8BFF',name:'Maya López',role:'Director',city:'Los Angeles',match:79,followers:'112K',eng:'5.3%',niche:'Fashion campaigns',tags:['Brand identity','Concept'],size:'macro'},
  {ini:'RT',bg:'rgba(0,201,141,.1)',col:'#00C98D',name:'Rodrigo Torres',role:'Musician',city:'Madrid',match:68,followers:'8.4K',eng:'14%',niche:'Flamenco fusion',tags:['Guitar','Acoustic'],size:'micro'},
  {ini:'KS',bg:'rgba(245,166,35,.1)',col:'#F5A623',name:'Keiko Saito',role:'Illustrator',city:'Los Angeles',match:82,followers:'54K',eng:'9.1%',niche:'Anime × music',tags:['Album art','Animation'],size:'mid'},
  {ini:'PB',bg:'rgba(99,102,241,.1)',col:'#818CF8',name:'Paulo Braga',role:'Producer',city:'Miami',match:90,followers:'32K',eng:'8.8%',niche:'Afrobeats Latin',tags:['Sync','Film score'],size:'mid'},
  {ini:'NG',bg:'rgba(255,91,91,.1)',col:'#FF5B5B',name:'Nicolás Gómez',role:'Videographer',city:'Bogotá',match:73,followers:'14K',eng:'10.2%',niche:'Documentaries',tags:['Concert film','BTS'],size:'micro'},
  {ini:'VR',bg:'rgba(59,139,255,.1)',col:'#3B8BFF',name:'Valentina Ríos',role:'Director',city:'Buenos Aires',match:66,followers:'78K',eng:'7.4%',niche:'Music videos',tags:['Narrative','Art film'],size:'mid'},
  {ini:'JC',bg:'rgba(0,201,141,.1)',col:'#00C98D',name:'Julia Castro',role:'Photographer',city:'Mexico City',match:88,followers:'29K',eng:'11.5%',niche:'Lifestyle & music',tags:['Editorial','Brand'],size:'mid'}
];

function filterDisc() {
  var role = document.getElementById('disc-role').value;
  var city = document.getElementById('disc-city').value;
  var size = document.getElementById('disc-size').value;
  var filtered = ALL_CREATORS.filter(function(c) {
    return (!role || c.role === role) && (!city || c.city === city) && (!size || c.size === size);
  });
  renderDiscGrid(filtered);
}

function renderDiscGrid(list) {
  var el = document.getElementById('disc-grid');
  if (!el) return;
  var cnt = document.getElementById('disc-count');
  if (cnt) cnt.textContent = list.length + ' creators found';
  el.innerHTML = list.map(function(c) {
    var tagsHTML = c.tags.map(function(t){return '<span class="ctag">'+t+'</span>';}).join('');
    return '<div class="disc-card" onclick="go(\'collabs\',null)">'
      +'<div class="dc-head"><div class="dc-av" style="background:'+c.bg+';color:'+c.col+'">'+c.ini+'</div>'
      +'<div style="flex:1"><div style="font-size:14px;font-weight:600;">'+c.name+'</div><div style="font-size:12px;color:var(--t3);margin-top:2px;">'+c.city+'</div></div>'
      +'<span class="dc-role-tag">'+c.role+'</span></div>'
      +'<div class="dc-stats">'
      +'<div class="dc-stat"><div class="dc-sv">'+c.followers+'</div><div class="dc-sl">Followers</div></div>'
      +'<div class="dc-stat"><div class="dc-sv">'+c.eng+'</div><div class="dc-sl">Engagement</div></div>'
      +'<div class="dc-stat"><div class="dc-sv up">'+c.match+'%</div><div class="dc-sl">Match</div></div>'
      +'</div>'
      +'<div class="dc-tags">'+tagsHTML+'</div>'
      +'<button class="cbtn" onclick="event.stopPropagation();sendCollab(this)">Send collab request</button>'
      +'</div>';
  }).join('');
}

// ── ONBOARDING ─────────────────────────────────────────────────
var obRole = 'musician';
function obSelRole(el, role) {
  obRole = role;
  document.querySelectorAll('.ob-role').forEach(function(b){b.classList.remove('on');});
  el.classList.add('on');
}
function obNext(step) {
  document.querySelectorAll('.ob-step').forEach(function(s){s.classList.remove('active');});
  document.getElementById('ob-s'+step).classList.add('active');
  if (step === 3) obRunAnalysis();
}
function obRunAnalysis() {
  var msgs = ['Reading your platform data...','Analyzing your best posting times...','Calculating audience overlap...','Building your weekly plan...','Done!'];
  var bars = ['Spotify sync','Instagram data','YouTube stats','Audience analysis'];
  var bEl = document.getElementById('ob-bars');
  bEl.innerHTML = bars.map(function(b,i){
    return '<div style="margin-bottom:12px;">'
      +'<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);margin-bottom:4px;"><span>'+b+'</span><span id="ob-pct-'+i+'">0%</span></div>'
      +'<div style="background:var(--s3);border-radius:4px;height:6px;overflow:hidden;"><div id="ob-bar-'+i+'" style="height:100%;border-radius:4px;background:var(--cyan);width:0%;transition:width .3s"></div></div>'
      +'</div>';
  }).join('');
  var t = 0;
  bars.forEach(function(_,i) {
    setTimeout(function(){
      var el = document.getElementById('ob-bar-'+i);
      var pe = document.getElementById('ob-pct-'+i);
      var p = 0;
      var iv = setInterval(function(){
        p = Math.min(p + Math.random()*15, 100);
        if (el) el.style.width = p+'%';
        if (pe) pe.textContent = Math.round(p)+'%';
        if (p >= 100) {
          clearInterval(iv);
          if (i === bars.length - 1) {
            var fb = document.getElementById('ob-finish-btn');
            if (fb) { fb.disabled = false; fb.style.opacity = '1'; fb.textContent = 'See your first week →'; }
          }
        }
      }, 80);
    }, i * 700);
  });
}
function obFinish() {
  state.onboarded = true;
  setRole(obRole, null); // also persists the chosen role and syncs the pills
  document.getElementById('ob-overlay').style.display = 'none';
}

// CHART
var chartBuilt = false;
function buildChart() {
  if (chartBuilt) return;
  if (typeof Chart === 'undefined') return; // Chart.js CDN unavailable (e.g. offline)
  chartBuilt = true;
  var ctx = document.getElementById('gc');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['May 5','May 12','May 19','May 26','Jun 2','Jun 9','Jun 16','Jun 23','Jun 30','Jul 7','Jul 14'],
      datasets: [
        {label:'Spotify',data:[9800,10200,10900,11100,11400,11800,12100,12400,null,null,null],borderColor:'#00C98D',backgroundColor:'rgba(0,201,141,.08)',tension:.4,pointRadius:3,fill:true},
        {label:'Instagram',data:[32000,33500,34800,35200,36100,36800,37400,38100,null,null,null],borderColor:'#3B8BFF',backgroundColor:'rgba(59,139,255,.06)',tension:.4,pointRadius:3,fill:true},
        {label:'TikTok',data:[4200,5100,6300,7200,8400,9100,10200,11900,null,null,null],borderColor:'#818CF8',backgroundColor:'rgba(129,140,248,.06)',tension:.4,pointRadius:3,fill:true},
        {label:'Spotify (projected)',data:[null,null,null,null,null,null,null,12400,13200,14600,16800],borderColor:'#00C98D',backgroundColor:'transparent',borderDash:[5,4],tension:.4,pointRadius:2,pointStyle:'circle',fill:false,borderWidth:1.5},
        {label:'Instagram (projected)',data:[null,null,null,null,null,null,null,38100,39400,41200,43500],borderColor:'#3B8BFF',backgroundColor:'transparent',borderDash:[5,4],tension:.4,pointRadius:2,fill:false,borderWidth:1.5},
        {label:'TikTok (projected)',data:[null,null,null,null,null,null,null,11900,14200,17400,21000],borderColor:'#818CF8',backgroundColor:'transparent',borderDash:[5,4],tension:.4,pointRadius:2,fill:false,borderWidth:1.5}
      ]
    },
    options: {
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{labels:{color:'#8899B8',font:{size:11},boxWidth:12,filter:function(item){return !item.text.includes('projected');}}},
        tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label.replace(' (projected)','')+': '+(ctx.parsed.y?ctx.parsed.y.toLocaleString():'')+(ctx.dataset.borderDash?' (projected)':'');}}}
      },
      scales:{x:{ticks:{color:'#4A5A72',font:{size:10}},grid:{color:'#1E2D45'}},y:{ticks:{color:'#4A5A72',font:{size:10}},grid:{color:'#1E2D45'}}}
    }
  });
}

// COLLABS
function sendCollab(btn) { btn.textContent = 'Request sent ✓'; btn.classList.add('sent'); toast('Collab request sent!'); }
function setChip(b) { document.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('on'); }); b.classList.add('on'); }

// DISTRIBUTE
function dTab(id, btn) {
  document.querySelectorAll('.dp').forEach(function(p) { p.classList.remove('on'); });
  document.getElementById('dp-' + id).classList.add('on');
  document.querySelectorAll('.dtab').forEach(function(b) { b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
}

var DIST_ROLE = {
  producer: {
    title: 'Beat Licensing Hub', sub: 'Sell and license your beats · Track placements',
    items: [
      {emoji:'🎵',title:'Calor',sub:'Exclusive license · Sold Jun 2026',stat:'$2,000',tag:'Sold'},
      {emoji:'🎵',title:'Dark Room',sub:'Non-exclusive · Artist Juana',stat:'$270',tag:'Live'},
      {emoji:'🎵',title:'Urban Summer Pack',sub:'Lease bundle · 5 beats',stat:'$750',tag:'Live'}
    ],
    cta:'+ Upload new beat', ctaAction:"openModal('new-release')",
    tips:['List beats at 3 tiers: lease ($30–$50), premium lease ($100–$150), exclusive ($300–$800).','Non-exclusive lets you sell the same beat multiple times — ideal for catalog growth.','Tag every beat with BPM, key, and mood for better search visibility on BeatStars and Spotify for Artists.']
  },
  director: {
    title: 'Project Showcase', sub: 'Publish your work · Attract new clients',
    items: [
      {emoji:'🎬',title:'Nike Latam Campaign',sub:'Brand video · Jun 2026',stat:'$5,000',tag:'Published'},
      {emoji:'🎬',title:'Band Tormenta MV',sub:'Music video · Jun 2026',stat:'$1,400',tag:'Published'},
      {emoji:'🎬',title:'Startup X Brand Film',sub:'Commercial · May 2026',stat:'$2,800',tag:'Published'}
    ],
    cta:'+ Add new project', ctaAction:"openModal('new-release')",
    tips:['Lead your portfolio with the project that shows the biggest brand name — it anchors perception.','Always list the result, not just the deliverable: "3M views" beats "brand video."','Case study format (Brief → Concept → Result) gets 5× more inbound on LinkedIn.']
  },
  photo: {
    title: 'Portfolio & Licensing', sub: 'License your images · Book sessions',
    items: [
      {emoji:'📸',title:'Artist Portrait Series',sub:'Sounds & Colours · Jun 2026',stat:'Published',tag:'Live'},
      {emoji:'📸',title:'Adobe Stock batch 1',sub:'200 images licensed',stat:'$180/mo',tag:'Earning'},
      {emoji:'📸',title:'Concert Series',sub:'Rolling Stone Latam',stat:'In review',tag:'Pending'}
    ],
    cta:'+ Upload new work', ctaAction:"openModal('new-release')",
    tips:['Adobe Stock and Getty pay 20–35% royalties per license. Upload in batches of 50+ for better visibility.','Vertical format (4:5) outperforms square on Instagram. Optimize your best shots for Reels.','Add location metadata to every image — it drives organic search traffic for event and venue shoots.']
  },
  video: {
    title: 'Video Portfolio & Licensing', sub: 'Publish your work · License footage',
    items: [
      {emoji:'🎥',title:'SportsCo brand video',sub:'3-min campaign · Jun 2026',stat:'$2,800',tag:'Delivered'},
      {emoji:'🎥',title:'Band Marea MV',sub:'Music video · In edit',stat:'$1,800',tag:'In production'},
      {emoji:'🎥',title:'Startup X social pack',sub:'8 Reels delivered',stat:'$1,200',tag:'Delivered'}
    ],
    cta:'+ Add project', ctaAction:"openModal('new-release')",
    tips:['Native LinkedIn video gets 5× more reach than a YouTube link. Always upload direct.','Watermarked showreel cuts are acceptable for Instagram — save the full quality for direct pitches.','Stock footage (Pond5, Shutterstock) of your B-roll earns passive income while you sleep.']
  }
};

function renderDistribute() {
  var rc = document.getElementById('dist-role-content');
  var mc = document.getElementById('dist-music-content');
  var dt = document.getElementById('dist-page-title');
  var ds = document.getElementById('dist-page-sub');
  if(!rc||!mc) return;
  if(currentRole === 'musician') {
    rc.style.display = 'none';
    mc.style.display = 'block';
    if(dt) dt.textContent = 'Distribute';
    if(ds) ds.textContent = 'Aura Distribution · Powered by DistroKid';
  } else {
    mc.style.display = 'none';
    rc.style.display = 'block';
    var d = DIST_ROLE[currentRole]||DIST_ROLE.producer;
    if(dt) dt.textContent = d.title;
    if(ds) ds.textContent = d.sub;
    rc.innerHTML = '<div class="card" style="margin-bottom:14px;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
      +'<div class="ctitle" style="margin-bottom:0;">Your work</div>'
      +'<button class="btn pri" onclick="'+d.ctaAction+'">'+d.cta+'</button>'
      +'</div>'
      +d.items.map(function(it){
        var tagC = it.tag==='Live'||it.tag==='Published'||it.tag==='Delivered'?'b-c':it.tag==='Earning'||it.tag==='Sold'?'b-a':'';
        return '<div class="rel-card">'
          +'<div class="rel-art">'+it.emoji+'</div>'
          +'<div style="flex:1"><div style="font-size:14px;font-weight:600;">'+it.title+'</div>'
          +'<div style="font-size:12px;color:var(--t3);margin-top:2px;">'+it.sub+'</div></div>'
          +'<div style="text-align:right"><div style="font-size:14px;font-weight:700;color:var(--cyan);">'+it.stat+'</div>'
          +'<span class="badge '+tagC+'" style="margin-top:4px;display:inline-block;">'+it.tag+'</span></div>'
          +'</div>';
      }).join('')
      +'</div>'
      +'<div class="card"><div class="ctitle">Growth tips for your role</div>'
      +d.tips.map(function(tip,i){
        return '<div class="ait" style="padding:8px 0;border-bottom:1px solid var(--b);">'
          +'<div class="ait-dot" style="margin-top:4px;"></div>'
          +'<div class="ait-txt" style="font-size:13px;color:var(--t2);">'+tip+'</div></div>';
      }).join('')
      +'</div>';
  }
}

// ADS
function selObj(btn) { btn.parentNode.querySelectorAll('.gchip').forEach(function(b) { b.classList.remove('on'); }); btn.classList.add('on'); }
function updBudget(v) {
  document.getElementById('bval').textContent = '$' + v;
  document.getElementById('bday').textContent = '$' + Math.round(v / 7) + '/day';
  document.getElementById('est-s').textContent = Math.round(v * 20) + '–' + Math.round(v * 30);
  document.getElementById('est-f').textContent = Math.round(v * 1.6) + '–' + Math.round(v * 2.8);
}
function launchCamp() { closeModal('campaign'); toast('Campaign launched! Results in 24-48h.'); }

// MESSAGES
var convs = [
  {id:'lr',name:'Lucas Rivas',ini:'LR',bg:'rgba(0,201,141,.1)',col:'#00C98D',role:'Musician · Mexico City',match:94,unread:2,msgs:[
    {f:'th',t:'Hey! Huge fan of your sound 🎵',time:'Mon 3:12pm'},
    {f:'th',t:'I think our audiences are super compatible. Would love to collab!',time:'Mon 3:13pm'},
    {f:'me',t:'Hey Lucas! I love your stuff too. What did you have in mind?',time:'Mon 4:45pm'},
    {f:'th',t:'Maybe a joint single? I have a track in progress with a similar vibe to "Marea".',time:'Mon 5:02pm'},
    {f:'me',t:"That sounds amazing. Let's set up a call!",time:'Mon 5:10pm'},
    {type:'prop',f:'th',time:'Tue 10am',pt:'Collab proposal: Joint single',pb:"I'd like to officially propose a collab. I'll provide production, you add vocals and guitar. Revenue split 50/50. Release Q3 2026."}
  ]},
  {id:'sp',name:'Sara Pinto',ini:'SP',bg:'rgba(59,139,255,.1)',col:'#3B8BFF',role:'Illustrator · Bogotá',match:88,unread:0,msgs:[
    {f:'me',t:"Hi Sara! Aura matched us at 88%. Looking for a visual artist for album artwork.",time:'Sun 11:20am'},
    {f:'th',t:"I'd love that! Let me check out your music.",time:'Sun 12:05pm'},
    {f:'th',t:"Just listened — your aesthetic is exactly what I love to illustrate!",time:'Sun 12:18pm'},
    {f:'me',t:"Perfect! I'll send you some references 🎨",time:'Sun 1:00pm'}
  ]},
  {id:'dm',name:'Diego Mora',ini:'DM',bg:'rgba(245,166,35,.1)',col:'#F5A623',role:'Photographer · Buenos Aires',match:76,unread:1,msgs:[
    {f:'th',t:"Hi! I specialize in artist sessions. Would you be interested?",time:'Sat 9:30am'},
    {f:'me',t:'Hey Diego! Yes, definitely. Do you shoot in BA?',time:'Sat 2:15pm'},
    {f:'th',t:'Yes, mostly BA. Check my portfolio: diegomora.co',time:'Sat 2:40pm'}
  ]}
];
var activeConv = null;
var msgsInited = false;
function initMsgs() {
  if (msgsInited) return;
  msgsInited = true;
  // Re-attach messages persisted from earlier sessions
  convs.forEach(function(c) {
    var extra = state.convExtra[c.id];
    if (extra && extra.length) c.msgs = c.msgs.concat(extra);
  });
  renderConvList(convs);
  var tot = convs.reduce(function(s,c){return s+c.unread;},0);
  var mn = document.getElementById('mnot');
  if (mn) mn.style.display = tot > 0 ? 'inline-block' : 'none';
}
function renderConvList(list) {
  var el = document.getElementById('clist'); el.innerHTML = '';
  list.forEach(function(c) {
    var last = c.msgs[c.msgs.length-1];
    var prev = last.type==='prop' ? 'Collab proposal' : escHTML(last.t);
    var div = document.createElement('div');
    div.className = 'ci' + (activeConv===c.id?' on':'');
    div.innerHTML = '<div class="cav2" style="background:'+c.bg+';color:'+c.col+'">'+c.ini+'</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--t1)">'+c.name+'</div><div style="font-size:12px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">'+prev+'</div></div>'
      +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><div style="font-size:10px;color:var(--t3)">'+last.time+'</div>'+(c.unread>0?'<div class="ci-un">'+c.unread+'</div>':'')+'</div>';
    div.onclick = (function(id){return function(){openConv(id);};})(c.id);
    el.appendChild(div);
  });
}
function filterConvs(q) { renderConvList(convs.filter(function(c){return c.name.toLowerCase().indexOf(q.toLowerCase())>=0;})); }
function openConv(id) {
  activeConv = id;
  var c = convs.find(function(x){return x.id===id;});
  c.unread = 0;
  renderConvList(convs);
  document.getElementById('chdr').innerHTML =
    '<div class="mav2" style="background:'+c.bg+';color:'+c.col+'">'+c.ini+'</div>'
    +'<div><div style="font-size:15px;font-weight:600;">'+c.name+'</div><div style="font-size:12px;color:var(--t3);">'+c.role+' · '+c.match+'% match</div></div>'
    +'<div style="margin-left:auto;display:flex;gap:8px;"><button class="btn" onclick="go(\'profile\',null)">Profile</button><button class="btn pri" onclick="openCollabCall(\''+c.name+'\')">📹 Call</button></div>';
  renderMsgs(c);
  document.getElementById('ncp').style.display = 'none';
  var cm = document.getElementById('cmain');
  cm.style.display = 'flex'; cm.style.flexDirection = 'column'; cm.style.overflow = 'hidden'; cm.style.flex = '1';
}
function renderMsgs(c) {
  var w = document.getElementById('cmsgs'); w.innerHTML = '<div style="text-align:center;font-size:11px;color:var(--t3);margin:4px 0;">Today</div>';
  c.msgs.forEach(function(m) {
    var d = document.createElement('div');
    if (m.type === 'prop') {
      d.className = 'mrow';
      d.innerHTML = '<div class="mav2" style="background:'+c.bg+';color:'+c.col+'">'+c.ini+'</div>'
        +'<div><div class="pc"><div class="pc-t">'+m.pt+'</div><div class="pc-b">'+m.pb+'</div>'
        +'<div class="pc-acts"><button class="pb acc" onclick="accProp(this)">Accept</button><button class="pb dec" onclick="decProp(this)">Decline</button></div>'
        +'</div><div style="font-size:10px;color:var(--t3);margin-top:3px;">'+m.time+'</div></div>';
    } else if (m.f === 'me') {
      d.className = 'mrow me';
      d.innerHTML = '<div class="mav2" style="background:var(--cs);color:var(--cyan)">MC</div>'
        +'<div><div class="bub me">'+escHTML(m.t)+'</div><div style="font-size:10px;color:var(--t3);margin-top:3px;text-align:right;">'+m.time+'</div></div>';
    } else {
      d.className = 'mrow';
      d.innerHTML = '<div class="mav2" style="background:'+c.bg+';color:'+c.col+'">'+c.ini+'</div>'
        +'<div><div class="bub th">'+escHTML(m.t)+'</div><div style="font-size:10px;color:var(--t3);margin-top:3px;">'+m.time+'</div></div>';
    }
    w.appendChild(d);
  });
  w.scrollTop = w.scrollHeight;
}
function sendMsg() {
  var inp = document.getElementById('cinp'); var txt = inp.value.trim();
  if (!txt || !activeConv) return;
  var c = convs.find(function(x){return x.id===activeConv;});
  if (!state.convExtra[c.id]) state.convExtra[c.id] = [];
  var mine = {f:'me',t:txt,time:'Now'};
  c.msgs.push(mine); state.convExtra[c.id].push(mine);
  saveState();
  inp.value = '';
  renderMsgs(c); renderConvList(convs);
  setTimeout(function() {
    var r = ['Sounds great!','Love that idea!','Yes! This is going to be amazing.','Perfect!','Let\'s make it happen!'];
    var reply = {f:'th',t:r[Math.floor(Math.random()*r.length)],time:'Now'};
    c.msgs.push(reply); state.convExtra[c.id].push(reply);
    saveState();
    renderMsgs(c); renderConvList(convs);
  }, 1500);
}
function mkKey(e) { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();} }
function accProp(btn) { btn.closest('.pc').innerHTML='<div style="color:var(--green);font-size:13px;font-weight:600;">✓ Proposal accepted! Let\'s make it happen.</div>'; toast('Collab accepted!'); }
function decProp(btn) { btn.closest('.pc').innerHTML='<div style="color:var(--t3);font-size:13px;">Proposal declined.</div>'; }

// MODALS
function openModal(id) { document.getElementById('modal-'+id).classList.add('open'); }
function closeModal(id) { document.getElementById('modal-'+id).classList.remove('open'); }
document.querySelectorAll('.modal').forEach(function(m) {
  m.addEventListener('click', function(e) { if (e.target===this) this.classList.remove('open'); });
});
function copyPitch() {
  var txt = document.getElementById('ptxt').innerText;
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){toast('✓ Pitch copied!');closeModal('pitch');});
  else toast('Select the text above and copy manually.');
}

// ── BILLING TOGGLE ─────────────────────────────────────────────
var isAnnual = false;
var PLANS = [
  {
    name:'Free', mo:0, yr:0, badge:'',
    feats:['Basic dashboard','5 collab matches / month','1 release / year','Community access','Public profile'],
    btnTxt:'Current plan', btnCls:'btn', onclick:''
  },
  {
    name:'Pro', mo:15, yr:12, badge:'',
    feats:['Full insights dashboard','Unlimited collabs','5 releases / year','Weekly career briefing','Strategy recommendations','Ads Manager (basic)'],
    btnTxt:'Upgrade to Pro', btnCls:'btn pri', onclick:"closeModal('upgrade');window.open('https://aura.app/checkout/pro','_blank')"
  },
  {
    name:'Studio', mo:29, yr:23, badge:'Best value',
    feats:['Everything in Pro','Unlimited releases','ISRC + UPC auto-generated','Smart Ads Manager (full)','Revenue dashboard','Priority support'],
    btnTxt:'Get Studio', btnCls:'btn pri', onclick:"closeModal('upgrade');window.open('https://aura.app/checkout/studio','_blank')", highlight:true
  }
];

function renderPlans() {
  var el = document.getElementById('up-plans-grid');
  if (!el) return;
  el.innerHTML = PLANS.map(function(p) {
    var price = isAnnual ? p.yr : p.mo;
    var period = isAnnual ? '/mo · billed annually' : '/mo';
    var saving = isAnnual && p.mo > 0 ? '<div style="font-size:11px;color:var(--green);margin-top:2px;">Save $'+(p.mo - p.yr)+'/mo vs monthly</div>' : '';
    var feats = p.feats.map(function(f){return '<li>'+f+'</li>';}).join('');
    var rec = p.badge ? '<div class="up-rec-tag">'+p.badge+'</div>' : '';
    var bdr = p.highlight ? 'border-color:var(--cyan);' : '';
    var btnPrice = price > 0 ? ' — $'+price : '';
    return '<div class="up-plan" style="'+bdr+'">'
      +rec
      +'<div class="up-plan-name">'+p.name+'</div>'
      +'<div class="up-plan-price">$'+price+'<span>'+period+'</span></div>'
      +saving
      +'<ul class="up-feat" style="margin-top:12px;">'+feats+'</ul>'
      +'<button class="'+p.btnCls+'" style="width:100%;margin-top:14px;justify-content:center;" onclick="'+p.onclick+'">'+p.btnTxt+btnPrice+'</button>'
      +'</div>';
  }).join('');
}

function toggleBilling() {
  isAnnual = !isAnnual;
  var knob = document.getElementById('bill-knob');
  var tog = document.getElementById('bill-tog');
  var lmo = document.getElementById('lbl-mo');
  var lyr = document.getElementById('lbl-yr');
  if (knob) knob.style.left = isAnnual ? '23px' : '3px';
  if (lmo) lmo.style.color = isAnnual ? 'var(--t3)' : 'var(--t1)';
  if (lyr) lyr.style.color = isAnnual ? 'var(--t1)' : 'var(--t3)';
  renderPlans();
}

// Hook renderPlans into openModal
var _origOpenModal = openModal;
openModal = function(id) {
  _origOpenModal(id);
  if (id === 'upgrade') renderPlans();
  if (id === 'epk') renderEPK();
};

// ── AI CHAT ────────────────────────────────────────────────────
var aiOpen = false;
var AI_RESPONSES = {
  musician: {
    suggestions: ['Why did my streams drop?','When should I release?','How do I grow on TikTok?','Which platform should I focus on?'],
    answers: {
      'Why did my streams drop?': 'Looking at your data — "Sin Señal" dropped 3% this month. The dip started June 10, right after you stopped posting TikToks for 8 days. Platform algorithms deprioritize catalog when you go quiet. Fix: 2 posts this week should recover it within 10 days.',
      'When should I release?': 'Based on your audience patterns, Friday July 18 is optimal. Your listeners are most active mid-July, and Friday releases in your genre outperform by 2.3×. I\'d start pre-save campaigns July 4.',
      'How do I grow on TikTok?': 'Your TikTok posts at 7–9pm average 4,200 views vs 1,400 at other times. That\'s 3× the result for zero extra effort. Tuesday and Thursday evenings are your peak. Also: your storytelling videos get 40% more saves than your performance clips.',
      'Which platform should I focus on?': 'TikTok right now — it\'s your fastest-growing channel (+3,100 followers this month) and it drives streams on other platforms. Every TikTok view converts to ~0.4 Spotify streams based on your last 3 posts.'
    }
  },
  producer: {
    suggestions: ['How do I get more sync placements?','Which beats are performing best?','How do I price my exclusives?','Where should I sell beats?'],
    answers: {
      'How do I get more sync placements?': 'Your "Calor" beat matches the current Netflix brief — 94 BPM, Afro-Latin energy, clean mix. Sync fees in that category run $2K–$8K. The brief closes Friday. I\'ve drafted a submission. Want me to pull it up?',
      'Which beats are performing best?': '"La Noche" has the most repeat streams (8 plays from the same 3 buyers) — that\'s a strong signal for exclusive interest. Price it 30% higher on next upload. "Fuego 2026" got 2 exclusive inquiries — you should have charged $400+, not $350.',
      'How do I price my exclusives?': 'Your avg exclusive is $310. Comparable producers at your output level in reggaeton-trap charge $400–$600. You\'re underpriced. Raise by $80 on next upload and track conversion — if it holds at 2/month, you\'re still good.',
      'Where should I sell beats?': 'BeatStars is your best channel right now (67% of sales). But YouTube beats channels get you discovered before purchase intent — 3 producers similar to you get 40% of their leads from YouTube placements. Worth testing 2 beats there this month.'
    }
  },
  director: {
    suggestions: ['Which client should I follow up with?','How do I raise my rate?','How do I get more inbound?','Which projects are most profitable?'],
    answers: {
      'Which client should I follow up with?': 'FashionCo has had your $4,500 proposal for 5 days with no reply. That\'s your priority today. 80% of creative deals that close needed a follow-up. One line email: "Checking in — any questions about the concept?" — that\'s it.',
      'How do I raise my rate?': 'Your avg project is $2,800. Your last 3 clients didn\'t negotiate — that\'s a signal you\'re underpriced. Add a "rush fee" option at +30% for timelines under 2 weeks. Also: your Nike campaign is quotable — use it to anchor at $5K for new proposals.',
      'How do I get more inbound?': 'You have zero content about your work online. One case study post (Nike campaign: problem → process → result) would generate 3–5 inbound leads based on your network size. It\'s the highest-leverage 2 hours you can spend this week.',
      'Which projects are most profitable?': 'Retainers are your best margin — Startup X at $2,000/month requires the least new work. One-off campaigns are highest per-project but cost you in new client acquisition. Target: 2 retainers + 1 campaign/month = $8K–$10K with predictable income.'
    }
  },
  photo: {
    suggestions: ['How do I get more bookings?','What should I charge?','How do I convert more profile visits?','Which type of work pays most?'],
    answers: {
      'How do I get more bookings?': 'Your booking conversion rate is 1.2% — industry avg is 3.1%. The gap is your bio: "DM for bookings" has no friction reduction. Replace it with a direct booking link (Calendly or similar). That one change typically 2–3× inquiry rate within 30 days.',
      'What should I charge?': 'Your portrait sessions at $300 are below market for your quality and city. Buenos Aires mid-tier photographers charge $380–$450. Your commercial rate at $1,200/half-day is fair but could hit $1,500 with one more editorial credit in your portfolio.',
      'How do I convert more profile visits?': 'Your IG profile gets ~420 visits/week but only 5 inquiries. 3 fixes: (1) booking link in bio, (2) highlight reel as first story highlight, (3) caption your best photo with "Booking open for August — link in bio." Test for 2 weeks.',
      'Which type of work pays most?': 'Commercial work ($1,200+/day) is your highest revenue per hour. Editorial pays less but unlocks commercial rate increases — one Pitchfork-ES credit could justify +$300 on your commercial rate. Portrait volume is steady but low ceiling.'
    }
  },
  video: {
    suggestions: ['How do I get brand clients?','Should I raise my rates?','How do I monetize YouTube?','What\'s my best lead source?'],
    answers: {
      'How do I get brand clients?': 'You have 14 YouTube Shorts with zero booking links. Every view is a lost lead. Add "Book a call →" to every description today — 5 minutes of work. Your SportsCo project is also pitchable to 3 similar brands in sportswear. Want me to identify them?',
      'Should I raise my rates?': 'Your brand video rate is $2,800 for 3 minutes. Comparable videographers in your market charge $3,500–$4,500. You\'re underpriced by ~25%. Try $3,200 on your next proposal — if they don\'t push back, you\'ve left $400 on the table for years.',
      'How do I monetize YouTube?': 'At 28K views/month your AdSense is $380 — normal for your niche (RPM ~$14). Faster path: use Shorts as a portfolio funnel, not a revenue source. Each Short that converts 1 client pays 7× more than a month of AdSense.',
      'What\'s my best lead source?': 'Your best lead source is previous clients — SportsCo came from a referral. 2 of your 4 lifetime clients came from referrals. You\'ve never asked for a referral directly. Email your 3 past clients today: "Know anyone who needs a video?" — that\'s enough.'
    }
  }
};

function toggleAIChat() {
  aiOpen = !aiOpen;
  var p = document.getElementById('ai-panel');
  if (aiOpen) {
    p.classList.add('open');
    initAIChat();
    var mem = document.getElementById('aura-memory');
    if (mem) mem.style.display = 'block';
  } else {
    p.classList.remove('open');
  }
}
var aiInited = false;
function initAIChat() {
  if (aiInited) return;
  aiInited = true;
  var msgs = document.getElementById('ai-msgs');
  var r = AI_RESPONSES[currentRole] || AI_RESPONSES.musician;
  msgs.innerHTML = '';
  addAIMsg('bot', 'Hey! I\'m Aura AI. I have access to your real data — ask me anything about your growth, strategy, or numbers.');
  // Restore persisted chat history
  state.aiHistory.forEach(function(m) {
    addAIMsg(m.role === 'user' ? 'usr' : 'bot', m.content);
  });
  var sugs = document.getElementById('ai-sugs');
  sugs.innerHTML = r.suggestions.map(function(s) {
    return '<button class="ai-sug" onclick="aiAsk(\''+s.replace(/'/g,"\\'")+'\')">' + s + '</button>';
  }).join('');
}
function addAIMsg(role, text) {
  var msgs = document.getElementById('ai-msgs');
  var d = document.createElement('div');
  d.className = 'ai-msg ' + role;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}
function pushAIHistory(role, content) {
  state.aiHistory.push({ role: role, content: content });
  if (state.aiHistory.length > 40) state.aiHistory = state.aiHistory.slice(-40);
  saveState();
}

function aiAsk(q) {
  document.getElementById('ai-inp').value = '';
  askAura(q);
}
function aiSend() {
  var inp = document.getElementById('ai-inp');
  var q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  askAura(q);
}

var aiBusy = false;
function askAura(q) {
  if (aiBusy) { toast('Aura is still answering — one moment.'); return; }
  addAIMsg('usr', q);
  pushAIHistory('user', q);
  if (state.apiKey) {
    callClaude();
  } else {
    answerFromCanned(q);
  }
}

// Offline fallback used when no API key is configured in Settings
var aiHintShown = false;
function answerFromCanned(q) {
  var r = AI_RESPONSES[currentRole] || AI_RESPONSES.musician;
  var found = Object.keys(r.answers).find(function(k) {
    return q.toLowerCase().indexOf(k.toLowerCase().split(' ')[1]) >= 0;
  });
  var ans = r.answers[q] || (found ? r.answers[found]
    : 'Great question. Based on your current data I\'d focus on the highest-leverage action this week. (Connect your Anthropic API key in Settings → Aura AI to get real answers.)');
  setTimeout(function() {
    addAIMsg('bot', ans);
    pushAIHistory('assistant', ans);
    if (!aiHintShown) {
      aiHintShown = true;
      addAIMsg('bot', 'Tip: add your Anthropic API key in Settings → Aura AI and I\'ll answer with a real model instead of canned replies.');
    }
  }, 600);
}

function buildAuraSystemPrompt() {
  var r = ROLES[currentRole];
  var goals = (GOAL_DATA[currentRole] || []).concat(userGoalsFor(currentRole));
  var pitches = (PITCH_DATA[currentRole] || []).concat(userPitchesFor(currentRole));
  var bench = BENCH[currentRole] || [];
  return 'You are Aura, an AI career copilot inside the Aura app for creative professionals. '
    + 'The user is a ' + r.label.toLowerCase() + ' named ' + profileName() + '. '
    + 'Answer questions about their growth, strategy, pricing, and pitching using their data below. '
    + 'Be specific and actionable, cite their numbers when relevant, and keep answers under 120 words. '
    + 'Plain text only — no markdown headers or bullets.\n\n'
    + 'Career stats: ' + JSON.stringify(r.stats) + '\n'
    + 'Dashboard metrics: ' + JSON.stringify(r.metrics) + '\n'
    + 'Goals: ' + JSON.stringify(goals) + '\n'
    + 'Recent pitches: ' + JSON.stringify(pitches) + '\n'
    + 'Niche benchmark: ' + JSON.stringify(bench) + '\n'
    + 'This week\'s priorities: ' + JSON.stringify(r.acts.map(function(a) { return a.title; }));
}

function callClaude() {
  aiBusy = true;
  var bubble = addAIMsg('bot', '· · ·');
  var messages = state.aiHistory.slice(-20).map(function(m) {
    return { role: m.role, content: m.content };
  });
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: buildAuraSystemPrompt(),
      messages: messages
    })
  }).then(function(resp) {
    return resp.json().then(function(data) { return { ok: resp.ok, status: resp.status, data: data }; });
  }).then(function(res) {
    aiBusy = false;
    if (!res.ok) {
      var msg = res.status === 401 ? 'That API key was rejected — double-check it in Settings → Aura AI.'
        : res.status === 429 ? 'Rate limited — give it a few seconds and try again.'
        : 'Something went wrong (' + res.status + '): ' + ((res.data.error && res.data.error.message) || 'unknown error');
      bubble.textContent = msg;
      return;
    }
    var text = (res.data.content || []).filter(function(b) { return b.type === 'text'; })
      .map(function(b) { return b.text; }).join('\n').trim();
    if (!text) text = 'I couldn\'t generate an answer for that one — try rephrasing?';
    bubble.textContent = text;
    pushAIHistory('assistant', text);
    var msgs = document.getElementById('ai-msgs');
    msgs.scrollTop = msgs.scrollHeight;
  }).catch(function(err) {
    aiBusy = false;
    bubble.textContent = 'Network error reaching the Anthropic API: ' + err.message;
  });
}

function saveApiKey() {
  var inp = document.getElementById('ai-key-input');
  if (!inp) return;
  var key = inp.value.trim();
  state.apiKey = key;
  saveState();
  updateApiKeyStatus();
  toast(key ? '✓ API key saved locally. Ask Aura is now live!' : 'API key cleared — Ask Aura will use demo replies.');
}
function updateApiKeyStatus() {
  var s = document.getElementById('ai-key-status');
  if (s) {
    s.textContent = state.apiKey ? 'Connected ✓ (key stored only in this browser)' : 'Not connected — demo replies only';
    s.style.color = state.apiKey ? 'var(--green)' : 'var(--t3)';
  }
  var inp = document.getElementById('ai-key-input');
  if (inp && state.apiKey) inp.value = state.apiKey;
}

// ── ANALYTICS ──────────────────────────────────────────────────
var anChart = null;
function openAnalytics(name, streams, trend, data) {
  openModal('analytics');
  document.getElementById('an-title').textContent = '📊 ' + name + ' — Analytics';
  var trendColor = trend >= 0 ? 'var(--green)' : 'var(--red)';
  var trendArrow = trend >= 0 ? '↑' : '↓';
  document.getElementById('an-stats').innerHTML =
    '<div class="an-stat"><div class="an-sv">'+streams.toLocaleString()+'</div><div class="an-sl">Total streams</div><div class="an-sd" style="color:'+trendColor+'">'+trendArrow+' '+Math.abs(trend)+'% this month</div></div>'
    +'<div class="an-stat"><div class="an-sv">'+(Math.round(streams*0.18)).toLocaleString()+'</div><div class="an-sl">Saves</div><div class="an-sd up">↑ 18% save rate</div></div>'
    +'<div class="an-stat"><div class="an-sv">'+(Math.round(streams*0.04)).toLocaleString()+'</div><div class="an-sl">Playlist adds</div><div class="an-sd up">↑ Growing</div></div>'
    +'<div class="an-stat"><div class="an-sv">76%</div><div class="an-sl">Completion rate</div><div class="an-sd up">↑ vs 61% avg</div></div>';
  document.getElementById('an-sources').innerHTML =
    ['Playlists','Search','Profile','Algorithmic','Direct'].map(function(s,i){
      var pcts=[42,28,16,10,4]; return '<div class="src-bar"><div class="src-label">'+s+'</div><div class="src-track"><div class="src-fill" style="width:'+pcts[i]+'%"></div></div><div class="src-pct">'+pcts[i]+'%</div></div>';
    }).join('');
  document.getElementById('an-geo').innerHTML =
    [['🇲🇽','Mexico','38%'],['🇦🇷','Argentina','22%'],['🇨🇴','Colombia','16%'],['🇪🇸','Spain','11%'],['🇺🇸','USA','8%']].map(function(g){
      return '<div class="geo-row"><span class="geo-flag">'+g[0]+'</span><span class="geo-cty">'+g[1]+'</span><span class="geo-pct">'+g[2]+'</span></div>';
    }).join('');
  setTimeout(function() {
    var ctx = document.getElementById('an-chart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (anChart) { anChart.destroy(); anChart = null; }
    anChart = new Chart(ctx, {
      type:'line',
      data:{
        labels:['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8'],
        datasets:[{label:'Streams',data:data,borderColor:'#818CF8',backgroundColor:'rgba(129,140,248,.08)',tension:.4,pointRadius:4,fill:true,borderWidth:2}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#4A5A72',font:{size:10}},grid:{color:'#1E2D45'}},y:{ticks:{color:'#4A5A72',font:{size:10}},grid:{color:'#1E2D45'}}}}
    });
  }, 100);
}

// ── CONTRACT BUILDER ───────────────────────────────────────────
function openContract() { openModal('contract'); cbNext(1); }
function cbNext(step) {
  document.querySelectorAll('.cb-step').forEach(function(s){s.classList.remove('active');});
  document.getElementById('cb-s'+step).classList.add('active');
  var dots = document.querySelectorAll('.cb-dot2');
  dots.forEach(function(d,i){d.classList.toggle('on', i < step);});
  if (step === 2) buildContractText();
  if (step === 3) toast('Contract signed! PDF ready to download. 🎉');
}
function updSplit(v) {
  var me = parseInt(v), th = 100 - me;
  document.getElementById('split-me-lbl').textContent = me + '%';
  document.getElementById('split-th-lbl').textContent = th + '%';
  document.getElementById('split-me').style.width = me + '%';
  document.getElementById('split-me').textContent = me + '%';
  document.getElementById('split-th').style.width = th + '%';
  document.getElementById('split-th').textContent = th + '%';
}
function selGchip(btn) {
  btn.parentNode.querySelectorAll('.gchip').forEach(function(b){b.classList.remove('on');});
  btn.classList.add('on');
}
function selGchipIn(btn, cls) {
  document.querySelectorAll(cls).forEach(function(b){b.classList.remove('on');});
  btn.classList.add('on');
}
function buildContractText() {
  var me = document.getElementById('split-me-lbl').textContent;
  var th = document.getElementById('split-th-lbl').textContent;
  var today = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  document.getElementById('cb-text').textContent =
'COLLABORATION AGREEMENT\n'
+'Date: '+today+'\n\n'
+'PARTIES\n'
+'Party A: '+profileName()+' ('+((state.profile && state.profile.handle) || '@mariacastro')+')\n'
+'Party B: Lucas Rivas (@lucasrivas)\n\n'
+'PROJECT\n'
+'Type: Joint single release\n'
+'Working title: Untitled Collaboration\n'
+'Territory: Worldwide\n'
+'Duration: 1 year from release date\n'
+'Exclusivity: Non-exclusive\n\n'
+'REVENUE SPLIT\n'
+'María Castro: '+me+' of net revenue\n'
+'Lucas Rivas: '+th+' of net revenue\n\n'
+'TERMS\n'
+'1. Both parties retain co-writing credits.\n'
+'2. Neither party may license the work exclusively without written consent.\n'
+'3. Revenue paid monthly via Aura Pay after $10 threshold.\n'
+'4. Either party may terminate with 30 days written notice.\n'
+'5. This agreement is governed by the laws of Mexico.\n\n'
+'SIGNATURES\n'
+'María Castro: ________________  Date: '+today+'\n'
+'Lucas Rivas:  ________________  Date: ________';
}

// Hook contract into message proposal accept
var _origAccProp = accProp;
accProp = function(btn) {
  btn.closest('.pc').innerHTML = '<div style="color:var(--green);font-size:13px;font-weight:600;">✓ Proposal accepted!</div><button class="btn pri" style="margin-top:10px;" onclick="openContract()">📄 Build contract →</button>';
  toast('Proposal accepted! Build your contract to lock it in.');
};

// TOAST
var tTimer;
function toast(msg) {
  var t = document.getElementById('tst');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(tTimer);
  tTimer = setTimeout(function(){t.classList.remove('show');}, 2800);
}

// ── LANDING / AUTH NAV ─────────────────────────────────────────
function showAuth(tab) {
  document.getElementById('lp').style.display = 'none';
  var ap = document.getElementById('auth-pg');
  ap.style.display = 'flex';
  authTab(tab || 'in');
}
function showLanding() {
  document.getElementById('auth-pg').style.display = 'none';
  document.getElementById('lp').style.display = 'block';
}
function authTab(t) {
  document.getElementById('tab-in').classList.toggle('on', t === 'in');
  document.getElementById('tab-up').classList.toggle('on', t === 'up');
  document.getElementById('auth-in').style.display = t === 'in' ? 'block' : 'none';
  document.getElementById('auth-up').style.display = t === 'up' ? 'block' : 'none';
}
function pickAuthRole(el) {
  document.querySelectorAll('.auth-rp').forEach(function(b){b.classList.remove('on');});
  el.classList.add('on');
}
function enterApp() {
  state.authed = true;
  saveState();
  document.getElementById('lp').style.display = 'none';
  document.getElementById('auth-pg').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('ob-overlay').style.display = state.onboarded ? 'none' : 'flex';
}

// ── NEW ACTION HELPERS ──────────────────────────────────────────

// Profile save
function saveProfile() {
  var name = document.getElementById('ep-name');
  var handle = document.getElementById('ep-handle');
  var role = document.getElementById('ep-role');
  var bio = document.getElementById('ep-bio');
  var tags = document.getElementById('ep-tags');
  state.profile = {
    name: name ? name.value.trim() : '',
    handle: handle ? handle.value.trim() : '',
    role: role ? role.value : 'Musician',
    bio: bio ? bio.value.trim() : '',
    tags: tags ? tags.value : ''
  };
  saveState();
  applyProfile();
  closeModal('edit-profile');
  toast('✓ Profile updated!');
}

function initials(name) {
  var parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0] || 'M')[0] + ((parts[1] || '')[0] || '')).toUpperCase();
}

function applyProfile() {
  var p = state.profile;
  if (!p) return;
  var ini = initials(p.name || 'María Castro');
  var uname = document.querySelector('.sfoot div div:first-child');
  if (uname) uname.textContent = p.name;
  var uav = document.querySelector('.sfoot .uav');
  if (uav) uav.textContent = ini;
  var pn = document.getElementById('prof-name');
  if (pn) pn.textContent = p.name;
  var ph = document.getElementById('prof-handle');
  if (ph) ph.textContent = p.handle + ' · ' + p.role + ' · ' + (p.tags.split(',')[0] || '').trim();
  var pb = document.getElementById('prof-bio');
  if (pb) pb.textContent = p.bio;
  var pt = document.getElementById('prof-tags');
  if (pt) pt.innerHTML = p.tags.split(',').map(function(t) {
    return '<span class="ctag">' + escHTML(t.trim()) + '</span>';
  }).join('');
  var pav = document.querySelector('.pav');
  if (pav && pav.firstChild && pav.firstChild.nodeType === 3) pav.firstChild.textContent = ini;
  // Refill the edit modal with saved values
  var map = {'ep-name': p.name, 'ep-handle': p.handle, 'ep-bio': p.bio, 'ep-tags': p.tags};
  for (var id in map) {
    var el = document.getElementById(id);
    if (el) el.value = map[id];
  }
  var roleSel = document.getElementById('ep-role');
  if (roleSel) roleSel.value = p.role;
}

function shareProfile() {
  var handleEl = document.getElementById('ep-handle');
  var handle = (handleEl && handleEl.value ? handleEl.value : '@mariacastro').replace('@', '');
  var link = 'aura.app/' + handle;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(function() { toast('✓ Profile link copied!'); });
  } else {
    toast(link);
  }
}

// Platform stats modal
function openPlatformStats(platform, headline, trend, insight) {
  var t = document.getElementById('pst-title');
  var b = document.getElementById('pst-body');
  if (t) t.textContent = platform;
  if (b) b.innerHTML =
    '<div style="font-size:22px;font-weight:700;margin-bottom:4px;color:var(--t1);">' + headline + '</div>'
    + '<div style="font-size:13px;color:var(--cyan);margin-bottom:12px;">' + trend + '</div>'
    + '<div style="background:var(--s3);border-radius:8px;padding:14px;font-size:13px;color:var(--t2);line-height:1.7;">'
    + '<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Aura insight</div>'
    + insight + '</div>';
  openModal('platform-stats');
}

// Connect platform modal
function openConnect(name, desc) {
  var t = document.getElementById('conn-title');
  var b = document.getElementById('conn-body');
  var id = document.getElementById('conn-id');
  if (t) t.textContent = 'Connect ' + name;
  if (b) b.textContent = desc;
  if (id) id.placeholder = name === 'TikTok' ? 'TikTok username' : 'Account ID';
  openModal('connect');
}

// Export modal
function openExport(title, includes) {
  var t = document.getElementById('exp-title');
  var d = document.getElementById('exp-desc');
  var inc = document.getElementById('exp-includes');
  if (t) t.textContent = 'Export: ' + title;
  if (d) d.textContent = 'Your export will be ready to download immediately.';
  if (inc) inc.innerHTML = includes.split(',').map(function(s){return '✓ ' + s.trim();}).join('<br>');
  openModal('export');
}

// Do export (CSV blob download)
function doExport() {
  var rows = [['Platform','Streams','Revenue','Period'],['Spotify','12381','$43.20','Jun 2026'],['Apple Music','2104','$8.95','Jun 2026'],['YouTube','N/A','$3.60','Jun 2026']];
  var csv = rows.map(function(r){return r.join(',');}).join('\n');
  var blob = new Blob([csv], {type:'text/csv'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'aura_export_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  closeModal('export');
  toast('✓ Download started!');
}

// Revenue report download
function downloadReport() {
  var rows = [['Platform','Streams','Revenue'],['Spotify','12381','$43.20'],['Apple Music','2104','$8.95'],['YouTube Content ID','—','$3.60'],['Total','—','$55.75']];
  var csv = rows.map(function(r){return r.join(',');}).join('\n');
  var blob = new Blob([csv], {type:'text/csv'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'aura_revenue_jun2026.csv';
  a.click();
  closeModal('payout-report');
  toast('✓ Download started!');
}

// EPK download
function downloadEPK() {
  var content = 'EPK — María Castro\n===================\nBio: Independent musician and visual creator.\nMonthly listeners: 12.4K | IG followers: 38.1K\nLatest release: Lluvia de Julio (July 18, 2026)\nBooking: maria@mariacastro.com\n';
  var blob = new Blob([content], {type:'text/plain'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'MaríaCastro_EPK_2026.txt';
  a.click();
  toast('✓ EPK downloaded!');
}

// Contract PDF download
function downloadContract() {
  var content = 'COLLABORATION AGREEMENT\n========================\nParties: María Castro & Collaborator\nDate: ' + new Date().toLocaleDateString() + '\nTerms: As outlined in Aura contract builder.\nSigned digitally via Aura.\n';
  var blob = new Blob([content], {type:'text/plain'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Aura_Contract_' + new Date().toISOString().slice(0,10) + '.txt';
  a.click();
  closeModal('contract');
  toast('✓ Contract downloaded!');
}

// Campaign detail modal
function openCampDetail(btn) {
  var card = btn.closest ? btn.closest('.camp') : null;
  var title = card ? (card.querySelector('[style*="font-weight:700"]') || card.querySelector('[style*="font-weight:600"]')) : null;
  var t = document.getElementById('cd-title');
  var b = document.getElementById('cd-body');
  if (t) t.textContent = title ? title.textContent : 'Campaign detail';
  if (b) b.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">'
    + '<div style="background:var(--bg);border:1px solid var(--b);border-radius:8px;padding:12px;"><div style="font-size:11px;color:var(--t3);margin-bottom:4px;">SPEND</div><div style="font-size:18px;font-weight:700;">$184</div></div>'
    + '<div style="background:var(--bg);border:1px solid var(--b);border-radius:8px;padding:12px;"><div style="font-size:11px;color:var(--t3);margin-bottom:4px;">STREAMS DRIVEN</div><div style="font-size:18px;font-weight:700;color:var(--green);">3,284</div></div>'
    + '<div style="background:var(--bg);border:1px solid var(--b);border-radius:8px;padding:12px;"><div style="font-size:11px;color:var(--t3);margin-bottom:4px;">COST PER STREAM</div><div style="font-size:18px;font-weight:700;">$0.056</div></div>'
    + '<div style="background:var(--bg);border:1px solid var(--b);border-radius:8px;padding:12px;"><div style="font-size:11px;color:var(--t3);margin-bottom:4px;">NEW SAVES</div><div style="font-size:18px;font-weight:700;color:var(--cyan);">412</div></div>'
    + '</div>'
    + '<div style="font-size:13px;color:var(--t2);line-height:1.7;background:var(--bg);border:1px solid var(--b);border-radius:8px;padding:14px;">'
    + '<strong style="color:var(--t1);">Aura analysis:</strong> This campaign is performing 22% above your historical cost-per-stream average ($0.072). The 18–24 Mexico City segment is converting at 4× the rate of other audiences. Consider doubling the budget on that segment for the last 7 days.'
    + '</div>';
  openModal('camp-detail');
}

// Pipeline card detail
function openPipeDetail(title, sub, val, due) {
  var t = document.getElementById('pipe-card-title');
  var b = document.getElementById('pipe-card-body');
  if (t) t.textContent = title;
  if (b) b.innerHTML =
    '<div style="font-size:13px;color:var(--t2);margin-bottom:12px;">' + sub + '</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">'
    + '<span style="background:var(--cs);color:var(--cyan);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">' + val + '</span>'
    + '<span style="background:var(--s3);color:var(--t3);padding:4px 10px;border-radius:20px;font-size:12px;">Due: ' + due + '</span>'
    + '</div>'
    + '<div style="font-size:13px;color:var(--t2);line-height:1.7;background:var(--s3);border-radius:8px;padding:14px;">'
    + 'Aura recommendation: Follow up within 48 hours if no response. Your average close rate at this stage is 34%.'
    + '</div>';
  openModal('pipe-detail');
}

// Release creator
function createRelease() {
  var title = document.getElementById('nr-title');
  if (title && !title.value.trim()) { title.focus(); return; }
  closeModal('new-release');
  toast('✓ Release workspace created for "' + (title ? title.value : 'New release') + '"!');
}

// Collab call
function openCollabCall(name) {
  toast('📹 Starting call with ' + name + '... (opens in your default video app)');
}

// ── BOOT / RESTORE ─────────────────────────────────────────────
function restoreNotifs() {
  var items = document.querySelectorAll('#npanel .ni2');
  items.forEach(function(item, i) {
    if (state.notifsRead.indexOf(i) >= 0) item.classList.remove('unread');
    item.addEventListener('click', function() {
      if (item.classList.contains('unread')) {
        item.classList.remove('unread');
        if (state.notifsRead.indexOf(i) < 0) state.notifsRead.push(i);
        saveState();
      }
      updateBellCount();
    });
  });
  updateBellCount();
}
function updateBellCount() {
  var badge = document.getElementById('bellcnt');
  if (!badge) return;
  var n = document.querySelectorAll('#npanel .ni2.unread').length;
  badge.textContent = n;
  badge.style.display = n > 0 ? 'flex' : 'none';
}

function togglePref(btn) {
  btn.classList.toggle('on');
  state.prefs[btn.dataset.pref] = btn.classList.contains('on');
  saveState();
}
function applyPrefs() {
  document.querySelectorAll('[data-pref]').forEach(function(btn) {
    var k = btn.dataset.pref;
    if (Object.prototype.hasOwnProperty.call(state.prefs, k)) {
      btn.classList.toggle('on', !!state.prefs[k]);
    }
  });
}

function signOut() {
  state.authed = false;
  saveState();
  location.reload();
}
function resetLocalData() {
  if (!confirm('Reset all locally saved Aura data (goals, pitches, settings, chat history)?')) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  location.reload();
}

document.addEventListener('DOMContentLoaded', function() {
  syncRolePills();
  applyPrefs();
  applyProfile();
  restoreNotifs();
  populatePipeStages();
  updateApiKeyStatus();
  if (state.authed) {
    document.getElementById('lp').style.display = 'none';
    document.getElementById('auth-pg').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('ob-overlay').style.display = state.onboarded ? 'none' : 'flex';
  } else {
    // Landing first; onboarding overlay stays hidden until sign-up completes
    document.getElementById('ob-overlay').style.display = 'none';
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function() {});
  }
});

