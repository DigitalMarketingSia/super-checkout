
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FooterPreviewProps {
  previewText: string;
}

export const FooterPreview = ({ previewText }: FooterPreviewProps) => {
  return (
    <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
      <CardHeader>
        <CardTitle className="text-white">Preview do Rodapé</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="text-center text-xs leading-relaxed space-y-2">
            {previewText.split('\n').map((line, index) => (
              <p key={index} className="text-gray-600">
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
