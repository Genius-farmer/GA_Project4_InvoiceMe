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
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={6} lg={4}>
          <Card className="p-4 shadow-sm">
            <h1 className="h4 mb-3 text-center">Create your account</h1>

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
                {submitting ? "Creating..." : "Sign up"}
              </Button>
            </Form>

            <p className="text-center mt-3 mb-0">
              Already have an account? <Link to="/sign-in">Sign in</Link>
            </p>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
