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
  { id: 'fluent-bit-kubernetes', name: 'Fluent Bit Kubernetes filter', owner: 'Fluent Bit', url: 'https://docs.fluentbit.io/manual/pipeline/filters/kubernetes', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'fluent-bit-otlp', name: 'Fluent Bit OpenTelemetry output', owner: 'Fluent Bit', url: 'https://docs.fluentbit.io/manual/data-pipeline/outputs/opentelemetry', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'otel-semconv', name: 'OpenTelemetry semantic conventions', owner: 'OpenTelemetry', url: 'https://opentelemetry.io/docs/specs/semconv/', authority: 'official', refreshCadenceDays: 7, sourceMode: 'rolling' },
  { id: 'gpu-signal-atlas-runbooks', name: 'GPU Signal Atlas demonstration runbooks', owner: 'GPU Signal Atlas maintainers', url: 'https://github.com/sivalinb/gpu-signal-atlas/blob/main/docs/RUNBOOKS.md', authority: 'internal', refreshCadenceDays: 30, sourceMode: 'snapshot' },
];
