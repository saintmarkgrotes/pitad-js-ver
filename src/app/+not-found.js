import { Screen, PageHeading } from '../components/common/ui';
import { NavLink } from '../components/common/NavLink';
export default function NotFound() {
  return <Screen><PageHeading eyebrow="OFF THE PATH" title="Let’s head back." description="This page doesn’t exist." /><NavLink href="/">Return to pitad →</NavLink></Screen>;
}
