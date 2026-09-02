export interface CorpusSource {
  id: string;
  name: string;
  owner: string;
  url: string;
  authority: 'official' | 'internal';
  refreshCadenceDays: number;
  sourceMode: 'rolling' | 'snapshot';
}

export const sourceManifest: CorpusSource[] = [
  { id: 'nvidia-xid-catalog', name: 'NVIDIA Xid catalog', owner: 'NVIDIA', url: 'https://docs.nvidia.com/deploy/xid-errors/analyzing-xid-catalog.html', authority: 'official', refreshCadenceDays: 7, sourceMode: 'snapshot' },
  { id: 'nvidia-xid-actions', name: 'NVIDIA Xid recovery guidance', owner: 'NVIDIA', url: 'https://docs.nvidia.com/deploy/xid-errors/working-with-xid-errors.html', authority: 'official', refreshCadenceDays: 7, sourceMode: 'snapshot' },
  { id: 'nvidia-dcgm-fields', name: 'NVIDIA DCGM field reference', owner: 'NVIDIA', url: 'https://docs.nvidia.com/datacenter/dcgm/latest/reference/dcgm-fields.html', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'nvidia-dcgm-exporter', name: 'NVIDIA DCGM Exporter metrics', owner: 'NVIDIA', url: 'https://docs.nvidia.com/datacenter/dcgm/latest/reference/dcgm-exporter-metrics.html', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'nvidia-gpu-operator', name: 'NVIDIA GPU Operator documentation', owner: 'NVIDIA', url: 'https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'nvidia-dcgm-field-ids', name: 'NVIDIA DCGM field identifiers', owner: 'NVIDIA', url: 'https://docs.nvidia.com/datacenter/dcgm/latest/dcgm-api/dcgm-api-field-ids.html', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'nvidia-nccl-troubleshooting', name: 'NVIDIA NCCL troubleshooting', owner: 'NVIDIA', url: 'https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting.html', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'nvidia-fabric-manager', name: 'NVIDIA Fabric Manager user guide', owner: 'NVIDIA', url: 'https://docs.nvidia.com/hgx-platforms/fabric-manager-user-guide/index.html', authority: 'official', refreshCadenceDays: 30, sourceMode: 'rolling' },
  { id: 'nvidia-gpu-operator-mig', name: 'NVIDIA GPU Operator MIG guide', owner: 'NVIDIA', url: 'https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'nvidia-k8s-device-plugin', name: 'NVIDIA Kubernetes device plugin', owner: 'NVIDIA', url: 'https://github.com/NVIDIA/k8s-device-plugin', authority: 'official', refreshCadenceDays: 14, sourceMode: 'rolling' },
  { id: 'nvidia-gpu-operator-troubleshooting', name: 'NVIDIA GPU Operator troubleshooting', owner: 'NVIDIA', url: 'https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/troubleshooting.html', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'fluent-bit-kubernetes', name: 'Fluent Bit Kubernetes filter', owner: 'Fluent Bit', url: 'https://docs.fluentbit.io/manual/pipeline/filters/kubernetes', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'fluent-bit-otlp', name: 'Fluent Bit OpenTelemetry output', owner: 'Fluent Bit', url: 'https://docs.fluentbit.io/manual/data-pipeline/outputs/opentelemetry', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'otel-semconv', name: 'OpenTelemetry semantic conventions', owner: 'OpenTelemetry', url: 'https://opentelemetry.io/docs/specs/semconv/', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'gpu-signal-atlas-runbooks', name: 'GPU Signal Atlas demonstration runbooks', owner: 'GPU Signal Atlas maintainers', url: 'https://github.com/sivalinb/gpu-signal-atlas/blob/main/docs/RUNBOOKS.md', authority: 'internal', refreshCadenceDays: 30, sourceMode: 'snapshot' },
];
