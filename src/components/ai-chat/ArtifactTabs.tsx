import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Plot from 'react-plotly.js';
import { ChatArtifact } from './types';

interface ArtifactTabsProps {
  artifacts: ChatArtifact[];
  summary: string;
}

export function ArtifactTabs({ artifacts, summary }: ArtifactTabsProps) {
  const combined = useMemo(() => {
    const result: ChatArtifact = {};
    for (const artifact of artifacts) {
      if (artifact.csv && !result.csv) result.csv = artifact.csv;
      if (artifact.html && !result.html) result.html = artifact.html;
      if (artifact.plotlyJson && !result.plotlyJson) result.plotlyJson = artifact.plotlyJson;
    }
    return result;
  }, [artifacts]);

  const hasSummary = Boolean(summary?.trim());
  const hasTable = Boolean(combined.csv);
  const hasChart = Boolean(combined.plotlyJson);
  const hasHtml = Boolean(combined.html);

  const tabs: Array<{ key: 'summary' | 'table' | 'chart' | 'html'; label: string }> = [];
  if (hasSummary) tabs.push({ key: 'summary', label: 'Summary' });
  if (hasTable) tabs.push({ key: 'table', label: 'Table' });
  if (hasChart) tabs.push({ key: 'chart', label: 'Chart' });
  if (hasHtml) tabs.push({ key: 'html', label: 'HTML' });

  const defaultTab = tabs[0]?.key;
  if (!defaultTab) return null;

  return (
    <Tabs defaultValue={defaultTab} className="rounded-md border bg-background/70 p-2 text-xs">
      <TabsList className={cn('grid w-full', tabs.length === 1 ? 'grid-cols-1' : tabs.length === 2 ? 'grid-cols-2' : tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="summary" className="mt-2">
        <div className="text-muted-foreground">Assistant explanation is shown above.</div>
      </TabsContent>

      <TabsContent value="table" className="mt-2">
        {combined.csv && <CsvTable csv={combined.csv} />}
      </TabsContent>

      <TabsContent value="chart" className="mt-2">
        {combined.plotlyJson && <PlotlyArtifact plotlyJson={combined.plotlyJson} />}
      </TabsContent>

      <TabsContent value="html" className="mt-2">
        {combined.html && (
          <div className="max-h-64 overflow-auto rounded border p-2 bg-background">
            <iframe
              title="artifact-html"
              className="w-full min-h-40 border-0"
              srcDoc={combined.html}
              sandbox=""
            />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function CsvTable({ csv }: { csv: string }) {
  const lines = csv.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  const rows = lines.map((line) => line.split(','));
  const header = rows[0];
  const body = rows.slice(1, 11);

  return (
    <div className="space-y-1">
      <div className="font-medium">Table</div>
      <div className="overflow-auto rounded border max-h-56">
        <table className="w-full min-w-[420px] text-[11px]">
          <thead className="bg-muted/50">
            <tr>
              {header.map((cell, i) => (
                <th key={i} className="px-2 py-1 text-left font-medium">
                  {cell || '-'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="border-t">
                {header.map((_, c) => (
                  <td key={c} className="px-2 py-1">
                    {row[c] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlotlyArtifact({ plotlyJson }: { plotlyJson: string }) {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const parsed = useMemo(() => {
    try {
      return JSON.parse(plotlyJson) as {
        data?: Record<string, unknown>[];
        layout?: Record<string, unknown>;
        config?: Record<string, unknown>;
      };
    } catch {
      return null;
    }
  }, [plotlyJson]);

  if (!parsed?.data || parsed.data.length === 0) {
    return (
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border p-2 bg-background">
        {plotlyJson}
      </pre>
    );
  }

  return (
    <div className="rounded border bg-background p-1 overflow-hidden">
      <Plot
        data={parsed.data}
        layout={{
          ...(parsed.layout ?? {}),
          autosize: true,
          font: { size: isMobile ? 10 : 12, ...(parsed.layout?.font as object | undefined) },
          title: typeof parsed.layout?.title === 'string'
            ? { text: parsed.layout.title, x: 0.02, xanchor: 'left', automargin: true, font: { size: isMobile ? 12 : 14 } }
            : { x: 0.02, xanchor: 'left', automargin: true, ...(parsed.layout?.title as object | undefined), font: { size: isMobile ? 12 : 14, ...((parsed.layout?.title as any)?.font ?? {}) } },
          margin: { l: isMobile ? 60 : 72, r: 18, t: isMobile ? 64 : 68, b: isMobile ? 68 : 74, pad: 8, ...(parsed.layout?.margin as object | undefined) },
          xaxis: {
            ...((parsed.layout?.xaxis as object | undefined) ?? {}),
            automargin: true,
            showticklabels: true,
            ticklabelposition: 'outside',
            tickangle: isMobile ? -30 : 0,
            ticks: 'outside',
            ticklen: 4,
            nticks: isMobile ? 5 : 7,
            tickfont: { size: isMobile ? 10 : 11, color: 'currentColor', ...((parsed.layout?.xaxis as any)?.tickfont ?? {}) },
            title: {
              ...((parsed.layout?.xaxis as any)?.title ?? {}),
              standoff: isMobile ? 14 : 18,
              font: { size: isMobile ? 11 : 12, ...((parsed.layout?.xaxis as any)?.title?.font ?? {}) },
            },
          },
          yaxis: {
            ...((parsed.layout?.yaxis as object | undefined) ?? {}),
            automargin: true,
            showticklabels: true,
            ticklabelposition: 'outside',
            ticks: 'outside',
            ticklen: 4,
            tickfont: { size: isMobile ? 10 : 11, color: 'currentColor', ...((parsed.layout?.yaxis as any)?.tickfont ?? {}) },
            title: {
              ...((parsed.layout?.yaxis as any)?.title ?? {}),
              standoff: isMobile ? 10 : 14,
              font: { size: isMobile ? 11 : 12, ...((parsed.layout?.yaxis as any)?.title?.font ?? {}) },
            },
          },
          legend: { orientation: 'h', y: -0.22, x: 0, ...((parsed.layout?.legend as object | undefined) ?? {}) },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        config={{ responsive: true, displaylogo: false, displayModeBar: false, scrollZoom: false, ...(parsed.config ?? {}) }}
        style={{ width: '100%', height: isMobile ? '240px' : '320px' }}
        useResizeHandler
      />
    </div>
  );
}
