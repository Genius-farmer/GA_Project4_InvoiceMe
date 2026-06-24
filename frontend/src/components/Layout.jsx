import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignout() {
    signOut();
    navigate("/sign-in");
  }

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="md" className="d-print-none">
        <Container>
          <Navbar.Brand as={NavLink} to="/">
            InvoiceMe
          </Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/" end>
              Dashboard
            </Nav.Link>
            <Nav.Link as={NavLink} to="/clients">
              Clients
            </Nav.Link>
            <Nav.Link as={NavLink} to="/invoices">
              Invoices
            </Nav.Link>
            {user?.role === "admin" && (
              <Nav.Link as={NavLink} to="/admin">
                Admin
              </Nav.Link>
            )}
          </Nav>
          <NavLink
            to="/settings"
            className="text-light text-decoration-none me-3"
          >
            {user?.displayName || user?.email}
          </NavLink>
          <Button variant="outline-light" size="sm" onClick={handleSignout}>
            Sign out
          </Button>
        </Container>
      </Navbar>
      <Container className="py-4">
        <Outlet /> {/* the active page renders here */}
      </Container>
    </>
  );
}
