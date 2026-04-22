import DesktopGate from './DesktopGate';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <DesktopGate>{children}</DesktopGate>;
}
