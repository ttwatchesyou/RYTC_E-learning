import AppShell from "@/components/motor-control/AppShell";
import PracticeLab from "@/components/motor-control/PracticeLab";

export default function MotorControlPracticePage() {
  return (
    <AppShell title="Motor Control Practice | Virtual Electrical Lab" fullWidth labMode>
      <PracticeLab />
    </AppShell>
  );
}
