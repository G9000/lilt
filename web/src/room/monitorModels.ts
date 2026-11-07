import { MAIN_SCREEN, SIDE_SCREEN, quadMatrix, type Quad } from './scene';

export const MONITOR_MODELS = ['retro', 'rounded', 'studio'] as const;
export type MonitorModel = typeof MONITOR_MODELS[number];
export const isMonitorModel = (value: string): value is MonitorModel => MONITOR_MODELS.some(model => model === value);
export const MODEL_BOX = [830, 290, 350, 260] as const;
// Registered UI contours follow the painted housing, opening and grounded foot.
export const MODEL_CONTOURS: Record<MonitorModel, { body: string; opening: string; screen: Quad }> = {
  retro: {
    body: 'M866 301 L1131 299 Q1169 299 1170 332 L1163 475 Q1161 507 1135 507 L1052 502 L1053 517 Q1096 518 1096 531 L1092 538 Q1005 553 918 536 L917 527 Q922 519 967 516 L967 499 L860 490 Q835 488 836 461 L838 330 Q839 303 866 301Z',
    opening: 'M878 326 L1096 326 Q1115 326 1114 344 L1108 454 Q1107 473 1091 473 L878 462 Q859 462 861 443 L864 345 Q864 327 878 326Z',
    screen: [[864,326],[1115,326],[1108,474],[859,462]],
  },
  rounded: {
    body: 'M867 301 L1137 300 Q1170 300 1170 332 L1165 477 Q1164 506 1137 506 L1050 502 L1050 514 Q1099 518 1099 532 L1096 538 Q1011 551 929 537 L926 529 Q930 518 976 514 L977 500 L861 490 Q836 487 836 461 L839 331 Q840 303 867 301Z',
    opening: 'M886 330 L1113 330 Q1129 330 1129 347 L1125 454 Q1125 472 1109 472 L883 462 Q865 462 866 444 L869 349 Q869 331 886 330Z',
    screen: [[869,330],[1129,330],[1125,472],[865,462]],
  },
  studio: {
    body: 'M862 303 L1148 303 Q1166 303 1166 322 L1160 481 Q1159 501 1142 501 L1053 496 L1053 518 L1108 521 Q1115 523 1111 531 L1090 539 L964 537 L904 530 L904 524 L964 511 L965 492 L859 487 Q843 486 843 469 L845 322 Q845 304 862 303Z',
    opening: 'M873 322 L1127 324 Q1139 324 1139 335 L1135 460 Q1135 472 1125 471 L873 460 Q862 460 863 450 L864 334 Q864 322 873 322Z',
    screen: [[864,322],[1139,324],[1135,472],[863,460]],
  },
};

/** Match the second monitor's existing perspective, including its stand's desk contact. */
export function monitorProjection(side: boolean) {
  if (!side) return new DOMMatrix();
  return new DOMMatrix(quadMatrix(1, 1, SIDE_SCREEN)).multiply(new DOMMatrix(quadMatrix(1, 1, MAIN_SCREEN)).inverse());
}

export function modelTransform(side: boolean) {
  const [x, y, w, h] = MODEL_BOX, projection = monitorProjection(side);
  const corners = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([px,py]) => {
    const p = projection.transformPoint({ x: px, y: py }); return [p.x / p.w, p.y / p.w];
  }) as Quad;
  return quadMatrix(w, h, corners);
}
