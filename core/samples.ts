export const samples = [
  {
    id: 'xid-79',
    label: 'Xid 79 + PCIe replay',
    text: 'NVRM: Xid (PCI:0000:65:00): 79, GPU has fallen off the bus.\nDCGM_FI_DEV_PCIE_REPLAY_COUNTER=184\nGPU_MODEL=H100 DRIVER=R565 NODE=gpu-worker-07',
  },
  {
    id: 'xid-48',
    label: 'Xid 48 + ECC',
    text: 'NVRM: Xid (PCI:0000:17:00): 48, An uncorrectable double bit error was detected.\nDCGM_FI_DEV_ECC_DBE_VOL_TOTAL=2\nGPU_MODEL=A100 DRIVER=R570',
  },
  {
    id: 'thermal',
    label: 'Thermal signal',
    text: 'DCGM_FI_DEV_GPU_TEMP=91\nDCGM_FI_DEV_POWER_USAGE=672\nGPU_MODEL=H100 DRIVER=R575\nWhat additional evidence is needed before calling this thermal throttling?',
  },
  {
    id: 'unknown',
    label: 'Unknown identifier',
    text: 'NVRM: Xid (PCI:0000:65:00): 999\nGPU_MODEL=H100 DRIVER=R565',
  },
] as const;
