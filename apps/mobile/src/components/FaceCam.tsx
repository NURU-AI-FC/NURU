import { type ComponentType, useMemo, useRef, useState } from 'react'
import { Linking, View } from 'react-native'
import { WebView as RNWebView } from 'react-native-webview'
import { BASE } from '@/lib/api'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Button, Chip, Row, T } from '@/ui/kit'

// FaceCam is the mobile twin of FaceCam in apps/web/src/Guard.tsx. It runs the
// same model (@vladmandic/face-api 1.7.15: TinyFaceDetector inputSize 320,
// 68 point landmarks, 128 number FaceRecognitionNet descriptor) in a WebView
// on the front camera, so a face enrolled on the web matches on the phone and
// the other way round. The weights come from the web app's own /models folder
// (the page's base URL is the web origin), with the npm package on jsDelivr as
// a fallback.
//
// On top of the web flow it asks for a head turn or a blink before it takes
// the descriptor, and the face must stay in view throughout, so holding up a
// photo does not pass.

// The package's prop types collapse to never under React Native 0.88, so describe the
// few props we use here.
const WebView = RNWebView as unknown as ComponentType<{
  originWhitelist: string[]; source: { html: string; baseUrl?: string }; style?: object
  scrollEnabled?: boolean; onMessage?: (e: { nativeEvent: { data: string } }) => void
  onError?: () => void; javaScriptEnabled?: boolean
  mediaCapturePermissionGrantType?: 'grant' | 'deny' | 'prompt' | 'grantIfSameHostElsePrompt' | 'grantIfSameHostElseDeny'
  allowsInlineMediaPlayback?: boolean; mediaPlaybackRequiresUserAction?: boolean
}>

const FACE_API = '1.7.15'
const ORIGIN = BASE.replace(/\/api$/, '')
// Same sandbox face the web app offers when it has no camera (apps/web/src/Guard.tsx).
const DEMO_FACE = Array.from({ length: 128 }, (_, i) => Math.round(Math.sin(i * 1.7) * 1000) / 10000)
const SANDBOX = process.env.EXPO_PUBLIC_DEMO !== 'false'

type Stage = 'start' | 'loading' | 'look' | 'live' | 'hold' | 'ok' | 'nocam' | 'nomodel'
type Msg = { type: 'stage'; stage: Stage; hint?: string; n?: number } | { type: 'face'; descriptor: number[] }

export function FaceCam({ mode, onFace }: { mode: 'enrol' | 'verify'; onFace: (d: number[]) => void }) {
  const { c } = useTheme()
  const [stage, setStage] = useState<Stage>('start')
  const [hint, setHint] = useState('')
  const [attempt, setAttempt] = useState(0)
  const done = useRef(false)
  const html = useMemo(() => page(mode, c.red, c.green, c.surface), [mode, c.red, c.green, c.surface])

  function message(e: { nativeEvent: { data: string } }) {
    let m: Msg
    try { m = JSON.parse(e.nativeEvent.data) } catch { return }
    if (m.type === 'stage') { setStage(m.stage); setHint(m.hint || '') }
    else if (m.type === 'face' && !done.current && Array.isArray(m.descriptor) && m.descriptor.length === 128) {
      done.current = true
      setStage('ok')
      setTimeout(() => onFace(m.descriptor), 400)
    }
  }
  const retry = () => { done.current = false; setStage('start'); setHint(''); setAttempt((n) => n + 1) }
  const failed = stage === 'nocam' || stage === 'nomodel'
  const order: Stage[] = ['look', 'live', 'hold', 'ok']
  const at = order.indexOf(stage)

  const text = {
    start: 'Allow the camera to continue',
    loading: 'Starting face check…',
    look: 'Centre your face in the oval, in good light',
    live: 'Now turn your head slowly to one side, or blink',
    hold: 'Look straight ahead and hold still',
    ok: 'Face captured',
    nocam: 'No camera found or permission was denied.',
    nomodel: 'Could not load the face check. Check your connection.',
  }[stage]

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      {failed ? (
        <View style={{ width: 220, height: 270, borderRadius: 110, borderWidth: 4, borderColor: c.red, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="scanface" size={72} color={c.muted} stroke={1.4} />
        </View>
      ) : (
        <View style={{ width: 220, height: 270 }}>
          <WebView
            key={attempt}
            originWhitelist={['*']}
            source={{ html, baseUrl: ORIGIN + '/' }}
            style={{ backgroundColor: 'transparent' }}
            scrollEnabled={false}
            javaScriptEnabled
            mediaCapturePermissionGrantType="grant"
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            onMessage={message}
            onError={() => setStage('nomodel')}
          />
        </View>
      )}
      <T v="s" tone={failed ? 'rd' : 't2'} center>{(stage === 'hold' || stage === 'look') && hint ? hint : text}</T>
      {!failed && (
        <Row gap={8}>
          {['Look ahead', 'Turn or blink', mode === 'enrol' ? 'Hold still' : 'Capture'].map((t, i) => (
            <Chip key={t} label={t} on={at > i} icon={at > i ? 'check' : undefined} />
          ))}
        </Row>
      )}
      {failed && <>
        <Button label="Try again" onPress={retry} />
        {stage === 'nocam' && <Button label="Open settings" variant="sec" icon="settings" onPress={() => Linking.openSettings()} />}
        {SANDBOX && <Button label="Use the sandbox face (demo only)" variant="ghost" onPress={() => onFace(DEMO_FACE)} />}
      </>}
    </View>
  )
}

// The page draws the mirrored preview in an oval and drives the checks. Each
// loop runs detection with landmarks; the descriptor is only computed for the
// frames it keeps. Detector settings match the web app so descriptors agree.
const page = (mode: 'enrol' | 'verify', red: string, green: string, surface: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden}
#o{position:absolute;inset:0;border-radius:50%;overflow:hidden;border:4px solid ${red};background:${surface};box-sizing:border-box;transition:border-color .2s}
#o.ok{border-color:${green}}
video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
</style></head><body><div id="o"><video id="v" autoplay playsinline muted></video></div>
<script>
var MODE=${JSON.stringify(mode)}, NEED=MODE==='enrol'?3:1;
function post(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m))}
function stage(s,h){post({type:'stage',stage:s,hint:h||''})}
function load(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function ear(p){return (d(p[1],p[5])+d(p[2],p[4]))/(2*d(p[0],p[3]))}
var stream;
async function models(f){
  var bases=['/models','https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${FACE_API}/model'];
  for(var i=0;i<bases.length;i++){
    try{await Promise.all([f.nets.tinyFaceDetector.loadFromUri(bases[i]),f.nets.faceLandmark68Net.loadFromUri(bases[i]),f.nets.faceRecognitionNet.loadFromUri(bases[i])]);return}catch(e){}
  }
  throw new Error('models')
}
async function run(){
  var v=document.getElementById('v');
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:480,height:480},audio:false});
    v.srcObject=stream;await v.play().catch(function(){});
  }catch(e){stage('nocam');return}
  stage('loading');
  try{
    if(!window.faceapi){
      try{await load('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${FACE_API}/dist/face-api.js')}
      catch(e){await load('https://unpkg.com/@vladmandic/face-api@${FACE_API}/dist/face-api.js')}
    }
    await models(faceapi);
  }catch(e){stage('nomodel');return}
  var f=faceapi, opt=new f.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.5});
  // look: a frontal face; live: a head turn or a blink; hold: frontal captures.
  var st='look', lost=0, open=0, closed=false, caps=[];
  stage('look');
  while(true){
    var r=await f.detectSingleFace(v,opt).withFaceLandmarks();
    if(!r){
      if(++lost>=4&&st!=='look'){st='look';caps=[];closed=false;open=0;stage('look','Keep your face in the oval')}
      else if(st==='look')stage('look','Centre your face in the oval, in good light');
      await sleep(120);continue;
    }
    lost=0;
    var p=r.landmarks.positions, j0=p[0].x, j16=p[16].x;
    var yaw=(p[30].x-j0)/(j16-j0)-0.5;
    var e=(ear(p.slice(36,42))+ear(p.slice(42,48)))/2;
    var frontal=Math.abs(yaw)<0.08;
    if(st==='look'){
      if(frontal){st='live';stage('live')}
    }else if(st==='live'){
      if(e>0.26)open++;
      if(open>=2&&e<0.2)closed=true;
      if(Math.abs(yaw)>0.16||(closed&&e>0.24)){st='hold';stage('hold','Look straight ahead and hold still')}
    }else if(st==='hold'){
      if(frontal&&e>0.2){
        var full=await f.detectSingleFace(v,opt).withFaceLandmarks().withFaceDescriptor();
        if(full){
          caps.push(full.descriptor);
          if(NEED>1)stage('hold','Hold still… '+caps.length+' of '+NEED);
          if(caps.length>=NEED){
            var avg=[];for(var i=0;i<128;i++){var s=0;for(var k=0;k<caps.length;k++)s+=caps[k][i];avg.push(s/caps.length)}
            document.getElementById('o').className='ok';
            post({type:'face',descriptor:avg});
            setTimeout(function(){stream&&stream.getTracks().forEach(function(t){t.stop()})},300);
            return;
          }
        }
      }else stage('hold','Look straight ahead and hold still');
    }
    await sleep(80);
  }
}
run();
</script></body></html>`
