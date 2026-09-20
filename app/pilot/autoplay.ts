// A browser may refuse to start a video that nobody touched the page for. A phone saving power (an iPhone in Low Power
// Mode) refuses even a silent, inline one. The first touch, click or key anywhere is permission enough: whatever was
// refused is started then, inside that gesture, which is what the browser asks for.
type Attempt=()=>void;
const refused=new Set<Attempt>();
let listening=false;

function listen(){
  if(listening||typeof window==='undefined')return;
  listening=true;
  const allow=()=>{const again=[...refused];refused.clear();for(const attempt of again)attempt();};
  for(const type of ['pointerup','touchend','click','keydown'] as const)window.addEventListener(type,allow,{capture:true,passive:true});
}

// Plays the video if that is still wanted; refused, it waits for the first gesture and tries again inside it.
// `alongside` are players to be given the same blessing in that gesture (started and stopped at once), so that a
// later play() of theirs from a timer is accepted too.
export function playWhenAllowed(video:HTMLVideoElement,wanted:()=>boolean=()=>true,alongside:()=>HTMLVideoElement[]=()=>[]){
  const attempt=(blessing=false)=>{
    if(!video.isConnected||!wanted())return;
    if(blessing)for(const other of alongside()){
      if(other===video||!other.isConnected||!other.paused)continue;
      other.play().then(()=>{other.pause();other.currentTime=0;}).catch(()=>{});
    }
    video.play().catch((error:unknown)=>{
      if(error instanceof DOMException&&error.name==='NotAllowedError'){refused.add(()=>attempt(true));listen();}
    });
  };
  attempt();
}
