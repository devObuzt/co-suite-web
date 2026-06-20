import {Composition} from 'remotion';
import manifest from './manifest.generated.json';
import {AiMontage} from './AiMontage';

const fps = manifest.fps;
const durationInFrames = Math.max(1, Math.ceil(manifest.durationSeconds * fps));

export const RemotionRoot = () => {
  return (
    <Composition
      id="AiMontage"
      component={AiMontage}
      durationInFrames={durationInFrames}
      fps={fps}
      width={manifest.width}
      height={manifest.height}
    />
  );
};
