import type { EChartsOption } from 'echarts';

import { ChartLegendPosition } from '@frontend/common';

interface LayoutOptions {
  zoom: number;
  textColor: string;
  showLegend?: boolean;
  legendPosition?: ChartLegendPosition;
  showDataZoom?: boolean;
  showVisualMap?: boolean;
}

export function buildLayout({
  zoom,
  textColor,
  legendPosition = 'bottom',
  showLegend = false,
  showDataZoom = false,
  showVisualMap = false,
}: LayoutOptions): Pick<EChartsOption, 'grid' | 'legend' | 'textStyle'> {
  const z = (v: number) => v * zoom;

  const baseTop = z(10);
  const baseRight = z(20);
  const baseBottom = z(20);
  const baseLeft = z(10);

  const legendThickness = showLegend ? z(120) : 0;
  const legendHeight = showLegend ? z(20) : 0;
  const dataZoomThickness = showDataZoom ? z(40) : 0;
  const visualMapThickness = showVisualMap ? z(60) : 0;

  const grid: EChartsOption['grid'] = {
    containLabel: true,
    borderColor: '#ccc',
  };

  const legend: EChartsOption['legend'] = {
    show: showLegend,
    type: 'scroll',
    itemWidth: z(20),
    itemHeight: z(10),
    textStyle: {
      fontSize: z(12),
      color: textColor,
      overflow: 'break',
      width: z(70),
    },
  };

  switch (legendPosition) {
    case 'top': {
      legend.orient = 'horizontal';
      legend.top = z(5);
      legend.left = 'center';
      legend.textStyle!.overflow = 'none';

      grid.top = baseTop + legendHeight;
      grid.bottom = baseBottom + dataZoomThickness + visualMapThickness;
      grid.left = baseLeft;
      grid.right = baseRight + visualMapThickness;
      break;
    }
    case 'bottom': {
      legend.orient = 'horizontal';
      legend.bottom = dataZoomThickness + visualMapThickness + z(10);
      legend.left = 'center';
      legend.textStyle!.overflow = 'none';

      grid.top = baseTop;
      grid.bottom =
        baseBottom + legendHeight + dataZoomThickness + visualMapThickness;
      grid.left = baseLeft;
      grid.right = baseRight + visualMapThickness;
      break;
    }
    case 'left': {
      legend.orient = 'vertical';
      legend.left = z(5);
      legend.top = 'middle';

      grid.top = baseTop;
      grid.bottom = baseBottom + dataZoomThickness + visualMapThickness;
      grid.left = baseLeft + legendThickness;
      grid.right = baseRight + visualMapThickness;
      break;
    }
    case 'right': {
      legend.orient = 'vertical';
      legend.right = visualMapThickness + z(5);
      legend.top = 'middle';

      grid.top = baseTop;
      grid.bottom = baseBottom + dataZoomThickness + visualMapThickness;
      grid.left = baseLeft;
      grid.right = baseRight + legendThickness + visualMapThickness;
      break;
    }
    default: {
      legend.show = false;
      grid.top = baseTop;
      grid.bottom = baseBottom + dataZoomThickness + visualMapThickness;
      grid.left = baseLeft;
      grid.right = baseRight + visualMapThickness;
      break;
    }
  }

  const textStyle: EChartsOption['textStyle'] = {
    fontFamily: 'Inter',
    fontWeight: 500,
  };

  return {
    grid,
    legend,
    textStyle,
  };
}
