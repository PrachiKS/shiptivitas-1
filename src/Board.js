import React from 'react';
import Dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';

export default class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      clients: {
        backlog: [],
        inProgress: [],
        complete: [],
      }
    };
    this.swimlanes = {
      backlog: React.createRef(),
      inProgress: React.createRef(),
      complete: React.createRef(),
    };
  }

  componentDidMount() {
    // Fetch from backend on page load
    this.fetchClients();

    // Set up Dragula
    this.drake = Dragula([
      this.swimlanes.backlog.current,
      this.swimlanes.inProgress.current,
      this.swimlanes.complete.current,
    ]);

    this.drake.on('drop', (el, target, source, sibling) => {
      this.updateClient(el, target, source, sibling);
    });
  }

  componentWillUnmount() {
    this.drake.remove();
  }

  fetchClients() {
    fetch('http://localhost:3001/api/v1/clients')
      .then(res => res.json())
      .then(clients => {
        const sorted = clients.sort((a, b) => a.priority - b.priority);
        this.setState({
          clients: {
            backlog:    sorted.filter(c => c.status === 'backlog'),
            inProgress: sorted.filter(c => c.status === 'in-progress'),
            complete:   sorted.filter(c => c.status === 'complete'),
          }
        });
      })
      .catch(err => console.error('Failed to fetch clients:', err));
  }

  updateClient(el, target, _, sibling) {
    // Revert DOM — React will re-render from state
    this.drake.cancel(true);

    // Find the new swimlane status
    let targetStatus = 'backlog';
    if (target === this.swimlanes.inProgress.current) targetStatus = 'in-progress';
    else if (target === this.swimlanes.complete.current) targetStatus = 'complete';

    const cardId = parseInt(el.dataset.id, 10);

    // Calculate new priority based on drop position
    const allClients = [
      ...this.state.clients.backlog,
      ...this.state.clients.inProgress,
      ...this.state.clients.complete,
    ];

    const targetLaneClients = allClients
      .filter(c => c.status === targetStatus && c.id !== cardId)
      .sort((a, b) => a.priority - b.priority);

    let targetPriority;
    if (sibling) {
      const siblingId = parseInt(sibling.dataset.id, 10);
      const siblingIndex = targetLaneClients.findIndex(c => c.id === siblingId);
      targetPriority = siblingIndex === -1 ? targetLaneClients.length + 1 : siblingIndex + 1;
    } else {
      targetPriority = targetLaneClients.length + 1;
    }

    // Call backend to persist the change
    fetch(`http://localhost:3001/api/v1/clients/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus, priority: targetPriority }),
    })
      .then(res => res.json())
      .then(updatedClients => {
        const sorted = updatedClients.sort((a, b) => a.priority - b.priority);
        this.setState({
          clients: {
            backlog:    sorted.filter(c => c.status === 'backlog'),
            inProgress: sorted.filter(c => c.status === 'in-progress'),
            complete:   sorted.filter(c => c.status === 'complete'),
          }
        });
      })
      .catch(err => console.error('Failed to update client:', err));
  }

  renderSwimlane(name, clients, ref) {
    return (
      <Swimlane name={name} clients={clients} dragulaRef={ref}/>
    );
  }

  render() {
    return (
      <div className="Board">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              {this.renderSwimlane('Backlog', this.state.clients.backlog, this.swimlanes.backlog)}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane('In Progress', this.state.clients.inProgress, this.swimlanes.inProgress)}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane('Complete', this.state.clients.complete, this.swimlanes.complete)}
            </div>
          </div>
        </div>
      </div>
    );
  }
}