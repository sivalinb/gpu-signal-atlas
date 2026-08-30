# Demonstration Evidence-Collection Runbooks

These runbooks are educational examples. They collect evidence and deliberately stop before disruptive recovery. Adapt them to the organization’s approved procedures, hardware support contract, and change policy.

## Runbook: Xid 79 / GPU inaccessible over PCIe

### Trigger

- Xid 79; or
- GPU disappears from the operating system; or
- Xid 79 plus increasing PCIe replay/AER signals.

### Evidence bundle

1. Record the first and last event timestamp in UTC.
2. Preserve every NVRM/Xid message before and after Xid 79 for the same bus address.
3. Record GPU UUID, PCI bus address, node, model, driver, firmware, runtime, pod/job, and workload owner.
4. Capture host PCIe Advanced Error Reporting messages for the same window.
5. Determine whether the GPU is still enumerated by the operating system.
6. Capture a time-bounded delta for the PCIe replay counter instead of only the absolute count.
7. Note recent host maintenance, power events, firmware changes, or physical changes.

### Stop condition

Evidence is packaged and routed to the organization’s hardware/platform decision owner. This project does not reset the GPU, drain the node, reboot the host, or replace hardware.

## Runbook: Xid 48 / uncorrectable ECC signal

### Trigger

- Xid 48; or
- increasing volatile double-bit ECC counter; or
- health signal referencing uncorrectable memory behavior.

### Evidence bundle

1. Bind all data to GPU UUID and collection time.
2. Capture volatile and aggregate double-bit ECC counters.
3. Repeat the volatile counter after a defined interval to detect growth.
4. Capture row-remapping or page-retirement state where the GPU supports it.
5. Preserve related Xids, especially a subsequent recovery-action event.
6. Record workload, driver, firmware, model, and whether the behavior reproduces across workloads.

### Stop condition

Evidence is complete enough for the authorized owner to apply the vendor and organizational policy. The runbook does not decide continued operation or replacement.

## Runbook: high temperature or power observation

### Trigger

- High `DCGM_FI_DEV_GPU_TEMP`; or
- high `DCGM_FI_DEV_POWER_USAGE`; or
- suspected thermal throttling.

### Evidence bundle

1. Collect temperature as a time series, not one point.
2. Collect GPU utilization, board power, configured power limit, clocks, and clock-event reasons over the same window.
3. Capture cooling/fan state and relevant node environmental telemetry.
4. Associate the window with workload phase and GPU identity.
5. Check for thermal-violation or related health signals.

### Interpretation boundary

High temperature or power under high utilization can be expected. Thermal throttling requires corroborating clock/violation evidence; one sample is insufficient.
