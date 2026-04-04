import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import RoomList from "./pages/RoomList";
import RoomDetail from "./pages/RoomDetail";
import RoomCreate from "./pages/RoomCreate";
import PlayerCard from "./pages/PlayerCard";
import LiveBingo from "./pages/LiveBingo";
import PrintCard from "./pages/PrintCard";
import Reports from "./pages/Reports";
import Subscription from "./pages/Subscription";
import BingoOperator from "./pages/BingoOperator";
import CardSelector from "./pages/CardSelector";
import OperatorSelect from "./pages/OperatorSelect";
import BuyCards from "./pages/BuyCards";
import BingoShow from "./pages/BingoShow";
import SellCards from "./pages/SellCards";
import Login from "./pages/Login";
import Register from "./pages/Register";

function Router() {
  return (
    <Switch>
      {/* Autenticação local */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Públicas */}
      <Route path="/" component={Home} />
      <Route path="/play/:token" component={PlayerCard} />
      <Route path="/live/:slug" component={LiveBingo} />
      <Route path="/print/:token" component={PrintCard} />
      <Route path="/buy/:slug" component={BuyCards} />
      <Route path="/show/:slug" component={BingoShow} />

      {/* Painel do operador (requer login) */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/rooms" component={RoomList} />
      <Route path="/rooms/new" component={RoomCreate} />
      <Route path="/rooms/:id" component={RoomDetail} />
      <Route path="/operator" component={OperatorSelect} />
      <Route path="/operator/:id" component={BingoOperator} />
      <Route path="/sell/:id" component={SellCards} />
      <Route path="/sell-old/:id" component={CardSelector} />
      <Route path="/reports" component={Reports} />
      <Route path="/subscription" component={Subscription} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
