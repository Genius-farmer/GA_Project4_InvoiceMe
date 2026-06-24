import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  Badge,
  Button,
  Table,
  Spinner,
  Alert,
  Row,
  Col,
  Modal,
  Form,
} from "react-bootstrap";
import { apiFetch } from "../api";

const STATUS_VARIANT = {
  draft: "secondary",
  issued: "primary",
  paid: "success",
  cancelled: "dark",
};
const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—";

export default function InvoiceDetail() {
  const { id } = useParams(); //read :id from the URL
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false); // for actions that change status
  const [showPayModal, setShowPayModal] = useState(false);
  const [paidDate, setPaidDate] = useState("");

  useEffect(() => {
    apiFetch(`/invoices/${id}`)
      .then((data) => setInvoice(data.invoice))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // PATCH /invoices/:id/{issue|pay|cancel} - then swap in the returned invoice
  async function runAction(action, body) {
    setActing(true);
    try {
      const data = await apiFetch(`/invoices/${id}/${action}`, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      });
      setInvoice(data.invoice);
    } catch (err) {
      window.alert(err.message);
    } finally {
      setActing(false);
    }
  }

  function openPayModal() {
    setPaidDate(new Date().toISOString().slice(0, 10)); // default to today
    setShowPayModal(true);
  }
  async function confirmPaid() {
    setShowPayModal(false);
    await runAction("pay", { paidAt: paidDate });
  }

  async function handleDelete() {
    if (!window.confirm("Delete this draft?")) return;
    try {
      await apiFetch(`/invoices/${id}`, { method: "DELETE" });
      navigate("/invoices");
    } catch (err) {
      window.alert(err.message);
    }
  }

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!invoice) return null;

  const subtotal = Number(invoice.subtotal);
  const taxRate = Number(invoice.taxRate);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  const billFrom = invoice.billFrom || {};

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1 className="h3 mb-1">
            {invoice.invoiceName || "Untitled invoice"}
          </h1>
          <div className="text-muted mb-1">
            {invoice.invoiceNumber || "Draft"}
          </div>
          <Badge bg={STATUS_VARIANT[invoice.status]}>{invoice.status}</Badge>
          {invoice.invoiceSeq && (
            <span className="text-muted ms-2 d-print-none">
              #{invoice.invoiceSeq}
            </span>
          )}
        </div>
        <div className="d-flex gap-2 d-print-none">
          <Button variant="outline-secondary" onClick={() => window.print()}>
            Print
          </Button>
          {invoice.status === "draft" && (
            <>
              <Button
                as={Link}
                to={`/invoices/${id}/edit`}
                variant="outline-secondary"
              >
                Edit
              </Button>
              <Button onClick={() => runAction("issue")} disabled={acting}>
                Issue
              </Button>
              <Button variant="outline-danger" onClick={handleDelete}>
                Delete
              </Button>
            </>
          )}
          {invoice.status === "issued" && (
            <>
              <Button
                as={Link}
                to={`/invoices/${id}/edit`}
                variant="outline-secondary"
              >
                Edit
              </Button>
              <Button
                variant="success"
                onClick={openPayModal}
                disabled={acting}
              >
                Mark paid
              </Button>
              <Button
                variant="outline-danger"
                onClick={() => runAction("cancel")}
                disabled={acting}
              >
                Void
              </Button>
            </>
          )}
        </div>
      </div>

      <Row className="mb-3">
        <Col md={4} className="mb-3 mb-md-0">
          <Card className="h-100">
            <Card.Body>
              <Card.Subtitle className="text-muted mb-2">
                Bill from
              </Card.Subtitle>
              {billFrom.businessName && (
                <div className="fw-semibold">{billFrom.businessName}</div>
              )}
              {billFrom.businessAddress && (
                <div>{billFrom.businessAddress}</div>
              )}
              {billFrom.businessEmail && <div>{billFrom.businessEmail}</div>}
              {billFrom.phone && <div>{billFrom.phone}</div>}
              {billFrom.paymentInstructions && (
                <>
                  <Card.Subtitle className="text-muted mt-3 mb-2">
                    Payment instructions
                  </Card.Subtitle>
                  <div>{billFrom.paymentInstructions}</div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3 mb-md-0">
          <Card className="h-100">
            <Card.Body>
              <Card.Subtitle className="text-muted mb-2">Bill to</Card.Subtitle>
              <div className="fw-semibold">{invoice.client?.companyName}</div>
              <div>{invoice.client?.billingAddress}</div>
              <div>{invoice.client?.companyEmail}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Issue date</span>
                <span>{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Due date</span>
                <span>{formatDate(invoice.dueDate)}</span>
              </div>
              {invoice.paidAt && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Paid on</span>
                  <span>{formatDate(invoice.paidAt)}</span>
                </div>
              )}
              {invoice.term && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Terms</span>
                  <span>{invoice.term}</span>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Table bordered responsive>
        <thead>
          <tr>
            <th>Role</th>
            <th>Description</th>
            <th className="text-end">Qty</th>
            <th className="text-end">Unit cost</th>
            <th className="text-end">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((li) => (
            <tr key={li.id}>
              <td>{li.gigRole}</td>
              <td>{li.gigDescription}</td>
              <td className="text-end">{li.quantity ?? "—"}</td>
              <td className="text-end">
                {li.unitCost != null
                  ? `$${Number(li.unitCost).toFixed(2)}`
                  : "—"}
              </td>
              <td className="text-end">
                $
                {(Number(li.quantity || 0) * Number(li.unitCost || 0)).toFixed(
                  2,
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="text-end">
              Subtotal
            </td>
            <td className="text-end">${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="text-end">
              Tax ({taxRate}%)
            </td>
            <td className="text-end">${tax.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="text-end fw-bold">
              Total
            </td>
            <td className="text-end fw-bold">${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </Table>

      {invoice.notes && (
        <Card className="mb-3">
          <Card.Body>
            <Card.Subtitle className="text-muted mb-2">Notes</Card.Subtitle>
            <div>{invoice.notes}</div>
          </Card.Body>
        </Card>
      )}

      <Button
        variant="link"
        className="px-0 d-print-none"
        onClick={() => navigate("/invoices")}
      >
        ← Back to invoices
      </Button>

      <Modal show={showPayModal} onHide={() => setShowPayModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Mark as paid</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="paidDate">
            <Form.Label>Payment date</Form.Label>
            <Form.Control
              type="date"
              value={paidDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPaidDate(e.target.value)}
            />
            <Form.Text className="text-muted">
              When did the money actually arrive? Defaults to today.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPayModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={confirmPaid} disabled={acting}>
            {acting ? "Saving…" : "Mark paid"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
