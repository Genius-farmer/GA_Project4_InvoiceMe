import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Form,
  Button,
  Alert,
  Card,
  Container,
  Row,
  Col,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext.jsx";

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signUp(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-primary min-vh-100 d-flex align-items-center py-5">
      <Container>
        <Row className="justify-content-center align-items-center g-5">
          <Col xs={12} lg={6} className="text-white">
            <p className="text-uppercase fw-semibold opacity-75 mb-2">
              Invoicing for freelancers
            </p>
            <h1 className="display-5 fw-bold mb-3">
              Get paid faster.
              <br />
              Look more professional.
            </h1>
            <p className="fs-5 opacity-75 mb-4">
              InvoiceMe helps you create polished invoices, track every payment,
              and know exactly what you've earned — without the spreadsheet
              chaos.
            </p>
            <ul className="list-unstyled fs-6 mb-0">
              <li className="mb-2">
                ✓ Branded invoices in minutes — no design skills required
              </li>
              <li className="mb-2">✓ Track every invoice from draft to paid</li>
              <li className="mb-2">
                ✓ See billed vs collected on one clean dashboard
              </li>
            </ul>
          </Col>

          <Col xs={12} sm={10} md={7} lg={4}>
            <Card className="p-4 shadow border-0">
              <h1 className="h4 mb-1 text-center">Create your account</h1>
              <p className="text-muted text-center mb-3">
                Start invoicing in minutes
              </p>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button type="submit" className="w-100" disabled={submitting}>
                  {submitting ? "Creating…" : "Sign up"}
                </Button>
              </Form>

              <p className="text-center mt-3 mb-0">
                Already have an account? <Link to="/sign-in">Sign in</Link>
              </p>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
