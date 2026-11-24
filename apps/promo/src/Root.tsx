import {Composition} from 'remotion';
import {Promo} from './Promo';
import {calculateMetadata} from './timeline';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HavenSpacePromo"
      component={Promo}
      durationInFrames={1950}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{scenes: [], music: null}}
      calculateMetadata={calculateMetadata}
    />
  );
};
