// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// import { AppModule } from './app/app.module';

// platformBrowserDynamic().bootstrapModule(AppModule)
//   .catch(err => console.log(err));



// import { bootstrapApplication } from '@angular/platform-browser';
// import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
// import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

// import { routes } from './app/app-routing.module';
// import { AppComponent } from './app/app.component';

// bootstrapApplication(AppComponent, {
//   providers: [
//     { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
//     provideIonicAngular(),
//     provideRouter(routes, withPreloading(PreloadAllModules)),
//   ],
// });

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));