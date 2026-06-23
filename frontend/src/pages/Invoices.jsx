import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table, Spinner, Alert, Button, Badge } from "react-bootstrap";
import { apiFetch } from "../api";

const STATUS_VARIANTS = {
  draft: "secondary",
  issued: "primary",
  paid: "success",
  cancelled: "dark",
};

// date-only fields are stored at UTC midnight - render in UTC so the day doesn't shift.
function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

// amount the client owes = subtotal + tax (Number() the Decimal strings first!)
function formatTotal(inv) {
  const total = Number(inv.subtotal) * (1 + Number(inv.taxRate) / 100);
  return `$${total.toFixed(2)}`;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/invoices")
      .then((data) => setInvoices(data.invoices))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Invoices</h1>
        <Button as={Link} to="/invoices/new">
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-muted">
          No invoices yet - Create your first invoice!
        </p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Number</th>
              <th>Client</th>
              <th>Issue date</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoiceSeq ?? "-"}</td>
                <td>
                  {inv.invoiceNumber ?? (
                    <span className="text-muted">Draft</span>
                  )}
                </td>
                <td>{inv.client?.companyName}</td>
                <td>{formatDate(inv.issueDate)}</td>
                <td>{formatTotal(inv)}</td>
                <td>
                  <Badge bg={STATUS_VARIANTS[inv.status]}>{inv.status}</Badge>
                </td>
                <td>
                  <Button
                    as={Link}
                    to={`/invoices/${inv.id}`}
                    size="sm"
                    variant="outline-primary"
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
