'use client';
import { TutorialContent } from './TutorialModal';
import MiniKisokos from './MiniKisokos';
import SzoKisokos from './SzoKisokos';
import RejtvenyTabs, { useMiniLive, useRejtvenyTab } from './RejtvenyTabs';

// A Kisokos két része (a mini élesítése után): Titkosírás és Mini. A rejtvényekről mindig az adott
// rejtvény kisokosára jutunk (a minik oldala a ?tab=mini címre visz).
export default function KisokosTabs() {
  const live = useMiniLive();
  const [tab, setTab] = useRejtvenyTab();
  if (!live) return <TutorialContent />;
  return (
    <>
      <RejtvenyTabs tab={tab} onChange={setTab} labels={{ titkos: 'Titkosírás', szo: 'Szókereső', mini: 'Mini' }} withSzo />
      {tab === 'mini' ? <MiniKisokos /> : tab === 'szo' ? <SzoKisokos /> : <TutorialContent />}
    </>
  );
}
