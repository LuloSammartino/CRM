import { useState } from "react";
import AddSaleDialog from "./AddSaleDialog";

type AddSaleButtonProps = {
  onCreated?: () => void;
};

export default function AddSaleButton({ onCreated }: AddSaleButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-800"
      >
        + Agregar venta
      </button>

      {open ? <AddSaleDialog onClose={() => setOpen(false)} onCreated={onCreated} /> : null}
    </>
  );
}
