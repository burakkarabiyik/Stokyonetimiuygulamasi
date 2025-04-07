import { Request, Response, NextFunction } from 'express';

// Kong API Gateway ile çalışmak için gerekli ön ek ayarlamaları
// Bu middleware, uygulamanın Kong üzerinden /stok ön eki ile yönlendirilen 
// istekleri doğru şekilde ele almasını sağlar

export const setupProxyMiddleware = (app: any) => {
  // Varlık klasörünü '/stok/assets' olarak yeniden yönlendir
  app.use('/stok/assets', (req: Request, res: Response, next: NextFunction) => {
    // Orijinal URL'den /stok ön ekini kaldır
    req.url = req.url.replace(/^\/stok/, '');
    next();
  });

  // API isteklerini '/stok/api' olarak yeniden yönlendir
  app.use('/stok/api', (req: Request, res: Response, next: NextFunction) => {
    // Orijinal URL'den /stok ön ekini kaldır
    req.url = req.url.replace(/^\/stok/, '');
    next();
  });

  // Statik dosyaları '/stok/' altında yayınla
  app.use('/stok', (req: Request, res: Response, next: NextFunction) => {
    // /stok ile başlayan tüm istekler için URL düzenlemesi
    req.url = req.url.replace(/^\/stok/, '');
    next();
  });

  // Kong için yönlendirme dokümanı
  app.get('/kong-config', (_req: Request, res: Response) => {
    res.json({
      message: 'Kong API Gateway Yapılandırma Bilgileri',
      routes: [
        {
          name: 'stok-app',
          paths: ['/stok', '/stok/*'],
          strip_path: false,
          service: {
            name: 'stok-service',
            url: 'http://sunucu-envanter:5000'
          }
        }
      ],
      notes: [
        'Kong API Gateway üzerinde yukarıdaki yapılandırmayı kullanarak uygulamaya erişim sağlayabilirsiniz.',
        'Bu yapılandırma, /stok ile başlayan tüm istekleri uygulamaya yönlendirecektir.',
        'strip_path: false ayarı, /stok ön ekinin korunmasını sağlar.'
      ]
    });
  });
};