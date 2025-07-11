import React, { useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import { AuthProvider } from './common/AuthContextType';
import { QueryClient, QueryClientProvider } from 'react-query';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import Mypage from './pages/Mypage';
import Email from './pages/EmailInquiry';

setupIonicReact();
const queryClient = new QueryClient();
const App: React.FC = () => {

  return (
    <IonApp>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <IonReactRouter>
            <IonRouterOutlet>
              <Route path='/' component={Home} exact={true} />
              <Route path='/mypage' component={Mypage} exact={true} />
              <Route path='/email' component={Email} exact={true} />
            </IonRouterOutlet>
          </IonReactRouter>
        </AuthProvider>
      </QueryClientProvider>
    </IonApp>
  );
};


export default App;
