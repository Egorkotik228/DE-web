'use client';

import React from 'react';
import { DataFlowData } from '@/types/course';
import { Activity, Database, Server, Cpu, HardDrive, ArrowRight } from 'lucide-react';

interface DataFlowPipelineProps {
  data: DataFlowData;
}

export const DataFlowPipeline: React.FC<DataFlowPipelineProps> = ({ data }) => {
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'source':
        return <Server className="w-4 h-4 text-sky-400" />;
      case 'transform':
        return <Cpu className="w-4 h-4 text-amber-400" />;
      case 'storage':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'queue':
        return <Activity className="w-4 h-4 text-purple-400" />;
      case 'consumer':
      default:
        return <HardDrive className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getStatusIndicator = (status?: string) => {
    switch (status) {
      case 'success':
        return <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />;
      case 'warning':
        return <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />;
      case 'error':
        return <span className="w-2 h-2 rounded-full bg-red-400" />;
      case 'running':
        return <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />;
      case 'idle':
      default:
        return <span className="w-2 h-2 rounded-full bg-[#7D8590]" />;
    }
  };

  return (
    <div className="border border-[#21262D] rounded-xl bg-[#090C10] p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          <Activity className="w-4 h-4" />
          <span>{data.title || 'Архитектурный конвейер данных (Data Flow Pipeline)'}</span>
        </div>
        {data.description && (
          <p className="text-xs text-[#7D8590] leading-relaxed">{data.description}</p>
        )}
      </div>

      {/* Nodes Flow */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 overflow-x-auto py-4">
        {data.nodes.map((node, index) => {
          const edge = data.edges.find((e) => e.from === node.id);

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div className="relative group min-w-[170px] bg-[#151B23] border border-[#21262D] hover:border-emerald-500/50 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-[#090C10] border border-[#21262D] flex items-center justify-center">
                    {getNodeIcon(node.type)}
                  </div>
                  {getStatusIndicator(node.status)}
                </div>

                <div>
                  <h4 className="text-xs font-mono font-bold text-[#E6EDF3] group-hover:text-emerald-400 transition-colors">
                    {node.label}
                  </h4>
                  {node.sublabel && (
                    <span className="text-[10px] text-[#7D8590] block leading-tight mt-0.5">
                      {node.sublabel}
                    </span>
                  )}
                </div>

                {node.details && (
                  <div className="mt-3 pt-2 border-t border-[#21262D]/60 text-[10px] font-mono text-[#7D8590]">
                    {node.details}
                  </div>
                )}
              </div>

              {/* Animated Connector Arrow between nodes */}
              {index < data.nodes.length - 1 && (
                <div className="flex flex-col items-center justify-center px-2 py-2 shrink-0">
                  {edge?.throughput && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-1">
                      {edge.throughput}
                    </span>
                  )}
                  <div className="relative flex items-center">
                    {/* Animated running pulse */}
                    <div className="w-12 h-1 bg-[#21262D] rounded-full relative overflow-hidden hidden md:block">
                      <div className="absolute top-0 bottom-0 left-0 w-4 bg-emerald-400 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-400 ml-1" />
                  </div>
                  {edge?.label && (
                    <span className="text-[9px] text-[#7D8590] mt-1 text-center max-w-[100px]">
                      {edge.label}
                    </span>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
