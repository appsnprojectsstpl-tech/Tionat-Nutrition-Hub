import ProductDetailClient from './client-page';

// Enable dynamic params for static export
export const dynamic = 'force-static';
// dynamicParams cannot be true in export mode without generated params, 
// so we set it to false.
// We return a dummy slug to ensure the function is detected and generates at least one page.
export async function generateStaticParams() {
  return [{ slug: 'default' }];
}
export const dynamicParams = false;

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
