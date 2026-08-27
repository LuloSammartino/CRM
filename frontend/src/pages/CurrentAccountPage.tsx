import CurrentAccountDebtorsDialog from "../components/CurrentAccountDebtorsDialog";
import PageHeader from "../components/PageHeader";

export default function CurrentAccountPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Cuenta corriente" tone="emerald" />
      <CurrentAccountDebtorsDialog />
    </div>
  );
}
