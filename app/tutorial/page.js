import Icon from '../../components/Icon';
import { TutorialContent } from '../../components/TutorialModal';

export const metadata = {
  title: 'Tutorial - Titkosírás',
  description: 'Három rövid, interaktív gyakorló feladat a kriptikus rejtvények alapjaihoz: szójáték, betűjáték és joker.',
};

export default function TutorialPage() {
  return (
    <div className="wrap">
      <h1 className="page-title">
        <Icon src="/icons/Tutorial.png" size={26} /> Tutorial
      </h1>
      <TutorialContent />
    </div>
  );
}
