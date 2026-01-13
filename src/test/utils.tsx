import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

export const renderWithRouter = (
  ui: ReactElement,
  { route = "/" }: { route?: string } = {}
) => {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
};

export const renderWithRoutes = (
  element: ReactElement,
  { route = "/", path = "/" }: { route?: string; path?: string } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>
  );
};
