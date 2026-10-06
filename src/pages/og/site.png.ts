import { pngResponse, renderSiteOg } from '../../utils/og';

export async function GET() {
  return pngResponse(await renderSiteOg());
}
