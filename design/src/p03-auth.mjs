import { icon, mobile, logo, topbar, naira } from './lib.mjs';

const th = 'light';
const dots = (n, on) => `<div class="row g6">${Array.from({ length: n }, (_, i) => `<i style="display:block;height:6px;border-radius:3px;width:${i === on ? 22 : 6}px;background:${i === on ? 'var(--red)' : 'var(--border)'}"></i>`).join('')}</div>`;
const langPill = `<div class="chip" style="height:34px">${icon('globe', 15)} English ${icon('chevd', 14)}</div>`;
const keypad = (extra = icon('fingerprint', 26, 'var(--red)')) => `<div class="col g8" style="padding:0 24px">${[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map(r => `<div class="row">${r.map(k => `<div class="key">${k}</div>`).join('')}</div>`).join('')}<div class="row"><div class="key">${extra}</div><div class="key">0</div><div class="key">${icon('chevl', 24)}</div></div></div>`;

// Mini phone preview used on onboarding slides
const miniCard = (inner, style = '') => `<div class="card" style="padding:14px;border-radius:18px;${style}">${inner}</div>`;

const splash = mobile('01 Splash', th, `
  <div class="col center g16 grow" style="margin-top:-40px">
    <div class="mark" style="width:96px;height:96px;border-radius:30px;font-size:54px;background:#fff;color:#E30613;box-shadow:0 20px 50px rgba(0,0,0,.25)">N</div>
    <div class="col center g6"><div style="font-size:40px;font-weight:800;letter-spacing:-1px;color:#fff">NURU</div><div class="b" style="color:rgba(255,255,255,.85)">Understand your money. In your language.</div></div>
  </div>
  <div class="col center g8" style="padding-bottom:56px"><div class="xs" style="color:rgba(255,255,255,.7)">In partnership with</div><div class="h4" style="color:#fff;letter-spacing:2px">PARTNER BANK</div></div>`, { statusLight: true, bg: 'linear-gradient(160deg,#E30613 0%,#A3000D 70%,#6B0008 100%)' });

const onboard = (n, title, body, art) => mobile(`0${n + 1} Onboarding ${n}`, th, `
  <div class="row between px20" style="height:52px">${logo(28)}<span class="s w6 t2">Skip</span></div>
  <div class="col center grow" style="padding:0 28px">${art}</div>
  <div class="col g16" style="padding:0 24px 48px">
    ${dots(3, n - 1)}
    <div class="h1">${title}</div>
    <div class="b t2">${body}</div>
    <div class="btn pri" style="margin-top:8px">${n === 3 ? 'Get started' : 'Next'} ${icon('chevr', 18)}</div>
  </div>`);

const art1 = `<div class="col g12" style="width:300px">
  ${miniCard(`<div class="row between"><span class="xs mu">October spend</span><span class="badge red">${icon('up', 11)} 12%</span></div><div class="h2 num" style="margin-top:4px">${naira(405200)}</div><div class="row g6" style="align-items:flex-end;height:70px;margin-top:10px">${[30, 46, 38, 60, 52, 70, 44, 64, 58, 80, 66, 72].map((h, i) => `<i style="display:block;flex:1;height:${h}%;border-radius:4px;background:${i === 9 ? 'var(--red)' : 'var(--surface2)'}"></i>`).join('')}</div>`)}
  ${miniCard(`<div class="row g10"><div class="ic red" style="width:36px;height:36px;border-radius:12px">${icon('sparkles', 18)}</div><div class="col g4 grow"><div class="s w6">Food is your top category</div><div class="xs t2">31% of spend · ${naira(126400)}</div></div></div>`, 'margin-left:30px')}
</div>`;
const art2 = `<div class="col g12" style="width:300px">
  <div class="row g8 wrap center">${['English', 'Yorùbá', 'Igbo', 'Hausa'].map((l, i) => `<span class="chip ${i === 1 ? 'on' : ''}" style="height:38px;font-size:14px">${l}</span>`).join('')}</div>
  <div class="bubble me" style="max-width:250px">Kí ló gbé owó mi lọ lóṣù yìí?</div>
  <div class="bubble ai" style="max-width:270px">Oúnjẹ ló gbà jù: ${naira(126400)}, ìyẹn 31% nínú gbogbo ìnáwó rẹ.</div>
  <div class="row g8" style="align-self:flex-start;background:var(--red50);border-radius:999px;padding:8px 14px">${icon('volume', 16, 'var(--red)')}<div class="row g4" style="align-items:center">${[8, 14, 20, 12, 18, 10, 16, 6, 12].map(h => `<i style="display:block;width:3px;height:${h}px;border-radius:2px;background:var(--red)"></i>`).join('')}</div><span class="xs rd w6">0:06</span></div>
</div>`;
const art3 = `<div class="col center g16" style="width:300px">
  <div style="width:150px;height:150px;border-radius:999px;background:var(--red50);display:flex;align-items:center;justify-content:center"><div style="width:104px;height:104px;border-radius:999px;background:var(--red);display:flex;align-items:center;justify-content:center;box-shadow:0 16px 40px rgba(227,6,19,.35)">${icon('shieldcheck', 52, '#fff', 1.8)}</div></div>
  <div class="row g8 wrap center">${[['fingerprint', 'Passkey'], ['scanface', 'Face 2FA'], ['lock', 'PIN'], ['shield', 'Encrypted']].map(([i, l]) => `<span class="chip">${icon(i, 15, 'var(--red)')} ${l}</span>`).join('')}</div>
</div>`;

const language = mobile('05 Choose language', th, `
  ${topbar('', { right: '<span class="s w6 rd">Skip</span>' })}
  <div class="col g8 px20"><div class="h1">Choose your language</div><div class="b t2">NURU will speak, write and explain your money in this language. You can change it any time.</div></div>
  <div class="col g12 px20" style="margin-top:20px">
    ${[['English', 'Hello! Let’s understand your money.', 'EN'], ['Yorùbá', 'Ẹ káàbọ̀! Ẹ jẹ́ ká mọ owó yín.', 'YO'], ['Igbo', 'Nnọọ! Ka anyị ghọta ego gị.', 'IG'], ['Hausa', 'Sannu! Mu fahimci kuɗin ka.', 'HA']].map(([l, s, c], i) => `
    <div class="row g12" style="padding:16px;border-radius:18px;border:1.5px solid ${i === 1 ? 'var(--red)' : 'var(--border)'};background:${i === 1 ? 'var(--red50)' : 'var(--bg)'}">
      <div class="av" style="background:${i === 1 ? 'var(--red)' : 'var(--surface2)'};color:${i === 1 ? '#fff' : 'var(--text)'};font-size:13px">${c}</div>
      <div class="col g4 grow"><div class="h4">${l}</div><div class="xs t2">${s}</div></div>
      <div class="ib" style="width:34px;height:34px;border-radius:999px;background:${i === 1 ? 'var(--red)' : 'var(--surface)'}">${icon(i === 1 ? 'check' : 'volume', 16, i === 1 ? '#fff' : 'var(--text2)')}</div>
    </div>`).join('')}
  </div>
  <div class="row g8 px20" style="margin-top:16px">${icon('mic', 16, 'var(--red)')}<span class="s t2">Voice replies available in all four languages</span></div>
  <div style="position:absolute;left:20px;right:20px;bottom:44px"><div class="btn pri">Continue in Yorùbá</div></div>`);

const welcome = mobile('06 Welcome', th, `
  <div class="row between px20" style="height:52px">${logo(30)}${langPill}</div>
  <div class="col grow" style="padding:16px 20px 0;gap:20px">
    <div class="hero col g16" style="padding:24px;height:330px">
      <div class="badge" style="background:rgba(255,255,255,.18);color:#fff;align-self:flex-start">${icon('sparkles', 12, '#fff')} AI financial copilot</div>
      <div style="font-size:30px;line-height:36px;font-weight:800;letter-spacing:-.8px">Don’t just see your money. Understand it.</div>
      <div class="s" style="opacity:.85">Insights, forecasts and smart decisions from your own transactions, in English, Yorùbá, Igbo or Hausa.</div>
      <div class="row g8" style="margin-top:auto">${['Insights', 'Voice', 'Secure'].map(t => `<span class="badge" style="background:rgba(255,255,255,.16);color:#fff;height:26px">${t}</span>`).join('')}</div>
    </div>
    <div class="col g12" style="margin-top:auto;padding-bottom:44px">
      <div class="btn pri">Create account</div>
      <div class="btn out">${icon('fingerprint', 18)} Sign in with passkey</div>
      <div class="row center g4 s t2">Already have an account? <span class="rd w6">Sign in</span></div>
      <div class="xs mu" style="text-align:center">By continuing you agree to our Terms and Privacy Policy. Protected by bank-grade encryption.</div>
    </div>
  </div>`);

const signup = mobile('07 Sign up', th, `
  ${topbar('Create account', { right: '<span class="xs mu">1 of 4</span>' })}
  <div class="px20"><div class="bar"><i style="width:25%"></i></div></div>
  <div class="col g16 px20" style="margin-top:20px">
    <div class="col g6"><div class="h2">Let’s get you started</div><div class="s t2">Use the same phone number as your bank account.</div></div>
    <div class="row g12"><div class="field grow"><span class="label">First name</span><div class="input">Adaeze</div></div><div class="field grow"><span class="label">Last name</span><div class="input">Okafor</div></div></div>
    <div class="field"><span class="label">Phone number</span><div class="input focus"><span class="row g6 w6">🇳🇬 +234 ${icon('chevd', 14)}</span><span style="width:1px;height:24px;background:var(--border)"></span><span class="grow">803 456 7890</span></div></div>
    <div class="field"><span class="label">Email address</span><div class="input">${icon('mail', 18, 'var(--muted)')}<span>adaeze.okafor@gmail.com</span></div></div>
    <div class="field"><span class="label">Password</span><div class="input">${icon('lock', 18, 'var(--muted)')}<span class="grow">••••••••••••</span>${icon('eyeoff', 18, 'var(--muted)')}</div>
      <div class="row g4">${[1, 1, 1, 0].map(o => `<i style="display:block;flex:1;height:4px;border-radius:2px;background:${o ? 'var(--green)' : 'var(--border)'}"></i>`).join('')}</div>
      <div class="row between"><span class="xs gr w6">Strong password</span><span class="xs mu">12+ chars · number · symbol</span></div></div>
    <div class="row g10" style="align-items:flex-start"><div style="width:20px;height:20px;border-radius:6px;background:var(--red);display:flex;align-items:center;justify-content:center;flex:none">${icon('check', 14, '#fff', 3)}</div><span class="s t2">I agree to the Terms, Privacy Policy and allow NURU to analyse my authorised transactions.</span></div>
  </div>
  <div style="position:absolute;left:20px;right:20px;bottom:44px"><div class="btn pri">Send verification code</div></div>`);

const otp = mobile('08 Verify OTP', th, `
  ${topbar('Verify phone', { right: '<span class="xs mu">2 of 4</span>' })}
  <div class="px20"><div class="bar"><i style="width:50%"></i></div></div>
  <div class="col g20 px20" style="margin-top:24px">
    <div class="ic red" style="width:56px;height:56px;border-radius:18px">${icon('phone', 26)}</div>
    <div class="col g6"><div class="h2">Enter the 6-digit code</div><div class="s t2">We sent it by SMS to <b class="w6" style="color:var(--text)">+234 803 *** 7890</b> and to your email.</div></div>
    <div class="row g8">${['4', '8', '1', '9', '', ''].map((d, i) => `<div class="pinbox ${i === 4 ? 'on' : ''}" style="width:50px">${d}</div>`).join('')}</div>
    <div class="row between"><span class="s t2">Didn’t get it? <span class="mu">Resend in 0:42</span></span><span class="s rd w6">Call me instead</span></div>
    <div class="soft row g10">${icon('shield', 18, 'var(--red)')}<span class="xs t2">NURU will never ask for this code by phone, SMS or chat. Codes expire after 5 minutes.</span></div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:30px">${keypad('')}</div>`);

const passkey = mobile('09 Create passkey', th, `
  ${topbar('Secure sign-in', { right: '<span class="xs mu">3 of 4</span>' })}
  <div class="px20"><div class="bar"><i style="width:75%"></i></div></div>
  <div class="col center g20" style="padding:40px 28px 0">
    <div style="width:132px;height:132px;border-radius:40px;background:var(--red50);display:flex;align-items:center;justify-content:center">${icon('scanface', 64, 'var(--red)', 1.6)}</div>
    <div class="col center g8"><div class="h2" style="text-align:center">Sign in with your face or fingerprint</div><div class="b t2" style="text-align:center">Create a passkey on this phone. No password to remember, and it can’t be phished or reused on another device.</div></div>
    <div class="col g10" style="width:100%">${[['shieldcheck', 'Stored only on your device'], ['zap', 'Sign in in under a second'], ['lock', 'Works with Face ID and fingerprint']].map(([i, t]) => `<div class="row g12 soft">${icon(i, 18, 'var(--red)')}<span class="s w5">${t}</span></div>`).join('')}</div>
  </div>
  <div class="col g10" style="position:absolute;left:20px;right:20px;bottom:44px"><div class="btn pri">${icon('fingerprint', 18)} Create passkey</div><div class="btn ghost">Maybe later</div></div>`);

const faceidPrompt = mobile('10 Passkey system prompt', th, `
  ${topbar('Secure sign-in', { right: '<span class="xs mu">3 of 4</span>' })}
  <div class="scrim"></div>
  <div class="sheet" style="align-items:center;padding-top:24px">
    <div class="grab"></div>
    <div class="h3">Create a passkey for NURU?</div>
    <div class="s t2" style="text-align:center">A passkey for “adaeze.okafor” will be saved in iCloud Keychain and available on your devices.</div>
    <div style="width:96px;height:96px;border-radius:28px;background:var(--surface);display:flex;align-items:center;justify-content:center;margin:8px 0">${icon('scanface', 52, 'var(--blue)', 1.6)}</div>
    <div class="s w6" style="color:var(--blue)">Face ID</div>
    <div class="btn pri" style="width:100%;background:var(--blue)">Continue</div>
    <div class="btn ghost" style="color:var(--blue)">Other options</div>
  </div>`);

const done = mobile('11 Account ready', th, `
  <div class="col center grow g20" style="padding:0 28px">
    <div style="width:120px;height:120px;border-radius:999px;background:var(--green50);display:flex;align-items:center;justify-content:center"><div style="width:80px;height:80px;border-radius:999px;background:var(--green);display:flex;align-items:center;justify-content:center">${icon('check', 44, '#fff', 3)}</div></div>
    <div class="col center g8"><div class="h1" style="text-align:center">Welcome, Adaeze!</div><div class="b t2" style="text-align:center">Your NURU account is ready. Next, verify your identity and link an account so NURU can start finding insights.</div></div>
    <div class="card col g12" style="width:100%">${[['check', 'Phone and email verified', 1], ['check', 'Passkey created', 1], ['user', 'Verify BVN and NIN', 0], ['link', 'Link a bank account', 0]].map(([i, t, d]) => `<div class="row g12"><div class="ic ${d ? 'green' : 'gray'}" style="width:32px;height:32px;border-radius:10px">${icon(i, 16)}</div><span class="s w5 grow" style="${d ? 'color:var(--muted)' : ''}">${t}</span>${d ? '' : icon('chevr', 16, 'var(--muted)')}</div>`).join('')}</div>
  </div>
  <div style="padding:0 20px 44px"><div class="btn pri">Verify my identity</div></div>`);

const signin = mobile('12 Sign in', th, `
  <div class="row between px20" style="height:52px"><div class="ib">${icon('chevl')}</div>${langPill}</div>
  <div class="col g20 px20" style="margin-top:12px">
    ${logo(44, false)}
    <div class="col g6"><div class="h1">Welcome back</div><div class="b t2">Sign in to see what your money did today.</div></div>
    <div class="field"><span class="label">Email or phone</span><div class="input">${icon('user', 18, 'var(--muted)')}<span>adaeze.okafor@gmail.com</span></div></div>
    <div class="field"><span class="label">Password</span><div class="input focus">${icon('lock', 18, 'var(--muted)')}<span class="grow">••••••••••••</span>${icon('eye', 18, 'var(--muted)')}</div></div>
    <div class="row between"><div class="row g8"><div class="toggle on"><i></i></div><span class="s">Remember this device</span></div><span class="s rd w6">Forgot password?</span></div>
    <div class="btn pri">Sign in</div>
    <div class="row g12" style="align-items:center"><div class="div grow" style="width:auto"></div><span class="xs mu">or</span><div class="div grow" style="width:auto"></div></div>
    <div class="row g12"><div class="btn out grow">${icon('scanface', 18)} Face ID</div><div class="btn out grow">${icon('fingerprint', 18)} Passkey</div></div>
  </div>
  <div class="row center g4 s t2" style="position:absolute;left:0;right:0;bottom:44px">New to NURU? <span class="rd w6">Create account</span></div>`);

const quickUnlock = mobile('13 Quick unlock (returning)', th, `
  <div class="col center g12" style="padding-top:40px">
    <div class="av" style="width:72px;height:72px;font-size:26px">AO</div>
    <div class="h3">Good evening, Adaeze</div>
    <div class="s t2">Enter your 6-digit app PIN</div>
    <div class="row g16" style="margin-top:12px">${[1, 1, 1, 0, 0, 0].map(o => `<div class="dot ${o ? 'on' : ''}"></div>`).join('')}</div>
    <div class="s rd w6" style="margin-top:8px">Use Face ID instead</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:70px">${keypad(icon('scanface', 26, 'var(--red)'))}</div>
  <div class="row center g4 s t2" style="position:absolute;left:0;right:0;bottom:34px">Not Adaeze? <span class="rd w6">Switch account</span></div>`);

const forgot = mobile('14 Forgot password', th, `
  ${topbar('Reset password')}
  <div class="col g20 px20" style="margin-top:16px">
    <div class="ic red" style="width:56px;height:56px;border-radius:18px">${icon('key', 26)}</div>
    <div class="col g6"><div class="h2">Forgot your password?</div><div class="s t2">Enter your email or phone. We’ll send a code to confirm it’s you, then you can set a new password.</div></div>
    <div class="field"><span class="label">Email or phone</span><div class="input focus">${icon('mail', 18, 'var(--muted)')}<span>adaeze.okafor@gmail.com</span></div></div>
    <div class="soft row g10">${icon('info', 18, 'var(--blue)')}<span class="xs t2">For your safety, transfers are paused for 24 hours after a password reset.</span></div>
  </div>
  <div style="position:absolute;left:20px;right:20px;bottom:44px"><div class="btn pri">Send reset code</div></div>`);

const newpass = mobile('15 New password', th, `
  ${topbar('Reset password')}
  <div class="col g16 px20" style="margin-top:16px">
    <div class="col g6"><div class="h2">Create a new password</div><div class="s t2">It must be different from passwords you used before.</div></div>
    <div class="field"><span class="label">New password</span><div class="input focus">${icon('lock', 18, 'var(--muted)')}<span class="grow">••••••••••••••</span>${icon('eye', 18, 'var(--muted)')}</div></div>
    <div class="field"><span class="label">Confirm password</span><div class="input">${icon('lock', 18, 'var(--muted)')}<span class="grow">••••••••••••••</span>${icon('check', 18, 'var(--green)')}</div></div>
    <div class="col g8 soft">${[['At least 12 characters', 1], ['One number and one symbol', 1], ['Upper and lower case', 1], ['Not found in leaked password lists', 1]].map(([t, o]) => `<div class="row g8">${icon(o ? 'check' : 'x', 16, o ? 'var(--green)' : 'var(--muted)')}<span class="s">${t}</span></div>`).join('')}</div>
  </div>
  <div style="position:absolute;left:20px;right:20px;bottom:44px"><div class="btn pri">Update password</div></div>`);

export default [splash, onboard(1, 'See where every naira goes', 'NURU turns your transactions into clear charts and plain-language insights, so patterns are obvious at a glance.', art1), onboard(2, 'Talk to your money in your language', 'Ask questions by text or voice in English, Yorùbá, Igbo or Hausa. NURU answers with your real numbers.', art2), onboard(3, 'Bank-grade security, built in', 'Passkeys, PIN and face verification protect every transfer. Your conversations are encrypted end to end.', art3), language, welcome, signup, otp, passkey, faceidPrompt, done, signin, quickUnlock, forgot, newpass];
