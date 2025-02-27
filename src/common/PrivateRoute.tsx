import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { useAuth } from './AuthContextType';

interface PrivateRouteProps extends RouteProps {
  component: React.ComponentType<any>;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ component: Component, ...rest }) => {
  const { isLoggedIn } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) =>
        isLoggedIn ? <Component {...props} /> : <Redirect to="/home" />
      }
    />
  );
};

export default PrivateRoute;
