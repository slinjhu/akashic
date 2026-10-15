---
title: "AWS networking"
tags:
  - AWS
  - Network
---

# AWS networking

Start with a network that has no internet connection. Put a server inside it. Then add only what that server needs to communicate.

We'll use one example throughout: a VPC with address range `10.0.0.0/16`. These notes cover ordinary regional VPCs and IPv4; the addresses are illustrative.

## 1. Start with an empty VPC

A **VPC (Virtual Private Cloud)** is your own logically isolated network in an AWS Region. Think of it as the boundary around the network you are building.

Give it an address range:

```mermaid
flowchart TB
    vpc["VPC: 10.0.0.0/16<br/>No servers yet<br/>No internet connection"]
```

For this example, we deliberately start without an internet gateway or connections to other networks. AWS's default VPC and setup wizards may already include internet connectivity, so they may not look like this starting point. See [AWS internet gateway documentation](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html).

**So far:** we have a network boundary and an address pool. We have not created a path to the internet.

## 2. Understand the address range: CIDR

`10.0.0.0/16` is **CIDR notation**, a compact way to describe a range of IP addresses. Each number between the dots is an **octet**: a group of 8 bits. Four octets make a 32-bit IPv4 address.

```mermaid
---
config:
  themeCSS: |
    .packetBlock:nth-of-type(1) { fill: rgba(96, 165, 250, 0.22); }
    .packetBlock:nth-of-type(2) { fill: rgba(52, 211, 153, 0.22); }
  packet:
    showBits: false
    paddingX: 0
    bitWidth: 22
    rowHeight: 64
---
packet
0-15: "Network ID — 16 fixed bits"
16-31: "Host ID — 16 variable bits"
```

**`/16` sets the dividing line after the first 16 bits.** The network portion stays fixed; the host portion can vary. In `10.0.0.0/16`, that fixes `10.0` and lets the last two numbers vary, giving every address from `10.0.0.0` through `10.0.255.255`.

The larger the number after `/`, the fewer bits can vary—and the smaller the address pool:

| Example | Fixed part | Part that can vary | Total addresses |
|---|---|---|---|
| `10.0.0.0/16` | First 16 bits: `10.0` | Last two numbers | 65,536 |
| `10.0.1.0/24` | First 24 bits: `10.0.1` | Last number | 256 |
| `10.0.1.25/32` | All 32 bits | None | 1 |

These examples line up with the dots because 16, 24, and 32 are multiples of 8. Other prefixes, such as `/20`, fix part of a number too. The rule is always the same: **`/n` fixes the first `n` bits**, leaving `2^(32 − n)` total addresses.

For now, our `/16` is the VPC's address pool. Next, we'll take a smaller `/24` range from it for a subnet.

## 3. Add a subnet and a server

A **subnet** takes a smaller address range from the VPC. This is where you place a server, such as an **EC2 instance**, AWS's virtual machine.

```mermaid
flowchart TB
    subgraph vpc["VPC: 10.0.0.0/16"]
        subgraph subnetA["Subnet A: 10.0.1.0/24"]
            app["App<br/>10.0.1.25"]
        end
    end
```

`10.0.1.0/24` covers `10.0.1.0` through `10.0.1.255`. AWS reserves some addresses in a subnet, so not every address is available for servers.

A VPC belongs to one Region. Each subnet belongs to exactly one **Availability Zone (AZ)** within that Region. A VPC can contain many subnets, including several in the same AZ or subnets in different AZs. See [AWS subnet concepts](https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html).

An AZ is one or more data centers with separate power and networking infrastructure. Its purpose is **failure isolation**: a problem in one AZ is less likely to affect another. AZs within a Region have fast network connections so an application can run across them. See [AWS Availability Zones](https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/availability-zones.html).

We start with one subnet to learn the pieces. For a production application that must survive an AZ outage, we'll need subnets and working copies of the application in multiple AZs. Creating extra subnets alone does not create those copies.

**So far:** the app has an address inside our network. It still has no internet path.

## 4. Add a second subnet: how does traffic find its way?

Put a database in another subnet:

```mermaid
flowchart LR
    subgraph vpc["VPC: 10.0.0.0/16"]
        direction LR
        subgraph subnetA["Subnet A: 10.0.1.0/24"]
            app["App<br/>10.0.1.25"]
        end
        subgraph subnetB["Subnet B: 10.0.2.0/24"]
            database["Database<br/>10.0.2.30"]
        end
        app -->|"Local route"| database
    end
```

When the app connects to `10.0.2.30`, AWS needs to know where to send the traffic. A **route table** supplies that answer.

Read each route as: “For this destination range, send traffic to this target.” Our starting table has one route:

| Destination | Target | Meaning |
|---|---|---|
| `10.0.0.0/16` | `local` | Keep traffic for this VPC inside this VPC |

The database address falls within that range, so the app has a local path to it. This connection stays inside the VPC.

Each subnet uses one subnet route table at a time. Subnets can share a table; without an explicit association, a subnet uses the VPC's main table. AWS creates a local route for the VPC's address range. See [AWS subnet route tables](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html).

**Separate subnets do not automatically block communication.** A subnet divides addresses and determines placement. Traffic restrictions are a separate concern.

## 5. Add permission to use the path

A route answers **“Where does traffic go?”** A **security group** answers **“Is this traffic allowed?”**

For the app to connect to the database, we need both:

- A path to the database's private IP, supplied here by the local route.
- Security rules allowing the connection: app outbound traffic and database inbound traffic on the database port.

For example, the database's security group could allow inbound TCP `5432` from the app's security group. A **port** identifies the service receiving a connection; PostgreSQL commonly listens on port `5432`. The database must actually be running and listening there.

Security groups contain allow rules, rather than explicit deny rules.

### 5.1. What does “stateful” mean? Can traffic go both ways?

**Traffic can flow both ways within an allowed connection. Permission to start a new connection is a separate question.**

Suppose the app starts a database connection on TCP port `5432`:

```mermaid
sequenceDiagram
    participant App as App: 10.0.1.25
    participant DB as Database: 10.0.2.30
    App->>DB: Start connection to port 5432
    Note over App,DB: Requires app outbound and database inbound permission
    DB-->>App: Return traffic on the allowed connection
    Note over App,DB: Security groups automatically allow this return traffic
```

The security groups track the connection. The database's replies are allowed even without a matching outbound rule on its security group, and the app can receive those replies without a matching inbound rule on its security group. This connection tracking is what **stateful** means. See [AWS security groups](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html).

Now suppose the database tries to start a **separate connection** to a service running on the app. That is not a reply. It needs database outbound permission and app inbound permission for that new connection.

| Traffic | What the security groups require |
|---|---|
| App starts a connection to the database | App outbound and database inbound rules must allow it |
| Database sends replies on that connection | Automatically allowed as return traffic |
| Database starts a separate connection to the app | Database outbound and app inbound rules must allow it |

The same principle applies when the app calls an external API: its response can return without an inbound security-group rule specifically allowing it. This automatic permission applies to security groups; it does not create a missing route or bypass other network filters.

There is also a subnet-level filter called a **network ACL**. We'll assume the default allow-all ACL for our example and return to it later.

**So far:** the app and database can communicate privately when the rules allow it. Neither needs internet access for this connection.

## 6. Add an internet gateway: public versus private subnets

Suppose we want to add a web server that visitors can reach from the internet. Keep the app and database where they are, and add Subnet C for the web server.

An **internet gateway (IGW)** connects a VPC to the internet. Attach one to the VPC and give Subnet C a route to it. This makes Subnet C public; Subnets A and B keep their local-only routes:

```mermaid
flowchart LR
    subgraph vpc["VPC: 10.0.0.0/16"]
        direction LR
        subgraph subnetA["Private subnet A: 10.0.1.0/24"]
            app["App<br/>10.0.1.25"]
        end
        subgraph subnetB["Private subnet B: 10.0.2.0/24"]
            database["Database<br/>10.0.2.30"]
        end
        subgraph subnetC["Public subnet C: 10.0.3.0/24"]
            web["Web server<br/>Private IP: 10.0.3.40<br/>Public IPv4 address assigned"]
        end
        igw["Internet gateway<br/>Attached to the VPC"]
        app -->|"Local route"| database
        web <-->|"Subnet C route: 0.0.0.0/0 to IGW"| igw
    end
    igw <--> internet["Internet"]
```

The IGW attaches to the VPC, not to an individual subnet. The arrows show the web server's internet path; security rules still control which connections are allowed.

Subnet C's route table now contains:

| Destination | Target | Meaning |
|---|---|---|
| `10.0.0.0/16` | `local` | VPC destinations stay local |
| `0.0.0.0/0` | Internet gateway | Send other IPv4 traffic toward the internet |

`0.0.0.0/0` means all IPv4 addresses. It acts as the fallback because routing chooses the **most specific matching range**. The database's `10.0.2.30` address still matches the more specific local route.

Subnet C is now a **public subnet** because it has a direct route to the IGW. Keep Subnets A and B on their local-only table, and they remain **private**.

| Subnet description | What its routes mean |
|---|---|
| Public | Has a direct route to an internet gateway |
| Private | Has no direct route to an internet gateway |
| Isolated | Has no routes to destinations outside the VPC |

Our local-only Subnets A and B are isolated as well as private. A private subnet can gain other connections later without becoming public. See [AWS subnet types](https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html).

To make the web server reachable, give it a public IPv4 address and allow its web port in its security group. It keeps its private address too: the IGW maps between the two addresses. The web application must be listening on that port. See [AWS internet gateway documentation](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html).

**The distinction:** “public” describes a subnet's route. It does not mean every resource in it is reachable from the internet. Attaching an IGW alone also does not make all subnets public.

## 7. Keep the app private, but let it call the internet

Now the app at `10.0.1.25` needs to call an external API. We want to keep it in private Subnet A with only its private IP.

Add a **public NAT gateway** to public Subnet C. NAT means **Network Address Translation**: it lets the app use a shared outward-facing address. This example uses a zonal NAT gateway with an **Elastic IP**, a public IPv4 address allocated to your AWS account.

```mermaid
flowchart LR
    subgraph vpc["VPC"]
        subgraph private["Private subnet A"]
            app["App: 10.0.1.25<br/>Private IP only"]
        end
        subgraph public["Public subnet C"]
            nat["Public NAT gateway"]
        end
        igw["Internet gateway"]
    end
    app --> nat --> igw --> internet["External API"]
```

Keep Subnet C's route to the IGW. Give Subnet A its own table with a default route to NAT; leave the database's Subnet B on its local-only table:

| Subnet | Destination | Target |
|---|---|---|
| Private A | `10.0.0.0/16` | `local` |
| Private A | `0.0.0.0/0` | NAT gateway |
| Public C | `10.0.0.0/16` | `local` |
| Public C | `0.0.0.0/0` | Internet gateway |

NAT translates addresses and tracks connections. The external API sees the NAT gateway's Elastic IP, and its replies return to the app through NAT.

An external host cannot use this NAT path to start an unsolicited connection to the app. The app can initiate a connection and receive its responses. See [AWS NAT gateways](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html).

**So far:** the app can call the internet while its subnet remains private. Its default route points to NAT, not directly to the IGW.

## 8. Reach S3 through a gateway endpoint

Suppose the app now needs to read files from **Amazon S3**, AWS's object storage service. We can give it a path specifically to S3.

A **VPC endpoint** provides a connection to a particular service without requiring an internet gateway or NAT for that connection.

First, separate two uses of “endpoint”:

- An **API endpoint** is the address you call, usually a hostname or URL.
- A **VPC endpoint** is a networking resource you create to reach a service.

For S3, create a **gateway endpoint** and associate it with Subnet A's route table. Remove Subnet A's default route to NAT for this example, leaving:

| Destination | Target |
|---|---|
| `10.0.0.0/16` | `local` |
| Regional S3 prefix list | S3 gateway endpoint |

A **prefix list** is a collection of IP ranges; AWS maintains this one for the service. Traffic matching it follows the endpoint route.

With this table, the app can reach matching S3 destinations, but it can no longer call an arbitrary external API. If we keep a default route to NAT instead of removing it, the more specific S3 route takes precedence for matching traffic.

S3 has not moved into our subnet. The endpoint gives us a route to the AWS-managed service. Gateway endpoints support S3 and DynamoDB. See [AWS gateway endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html).

**So far:** the app can reach the database locally and S3 through the endpoint. Without its NAT route, it can no longer call the external API.

## 9. Reach another service through a private IP

Now the app needs to retrieve a password from **Secrets Manager**. This service uses a different kind of VPC endpoint: an **interface endpoint**.

An interface endpoint creates a virtual network interface, called an **ENI**, with a private IP in each selected subnet. Think of it as a private entry point to the service. The underlying connectivity technology is called **AWS PrivateLink**; gateway endpoints use a different mechanism.

```mermaid
flowchart LR
    app["App: 10.0.1.25"] --> ep["Endpoint network interface<br/>Private IP in VPC"]
    ep --> service["Secrets Manager"]
```

The app normally calls the service by its hostname. **DNS** turns that name into an IP address. With private DNS enabled for the endpoint, the service's usual hostname resolves inside the VPC to the endpoint's private IPs.

The app can usually keep using the same service hostname. Its traffic now goes to the private interface. You do not add an S3-style service route: the destination IP is already reachable inside the VPC.

Private DNS requires VPC DNS support and DNS hostnames to be enabled. The endpoint's security group must allow client connections, commonly inbound HTTPS on TCP `443`. See [AWS interface endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html).

**Remember the mechanism:** a gateway endpoint changes the route for service traffic; an interface endpoint provides private IPs to connect to.

This also explains why a public destination IP does not always mean traffic goes through the internet. S3's hostname can resolve to public service IPs while the matching traffic follows the gateway endpoint route.

## 10. Put the pieces together: pull a container image from ECR

Keep the app in Subnet A with its S3 endpoint route and no NAT route. We want its EC2 instance to pull a private container image from **Amazon ECR**, AWS's container image registry, in the same Region.

A typical EC2 image pull needs three service paths:

| Needed for | Connection |
|---|---|
| Authentication and ECR API calls | `ecr.api` interface endpoint |
| Registry requests, such as fetching the image manifest | `ecr.dkr` interface endpoint |
| Downloading image layers stored in S3 | S3 gateway endpoint |

The endpoint service names are `com.amazonaws.<region>.ecr.api`, `com.amazonaws.<region>.ecr.dkr`, and `com.amazonaws.<region>.s3`.

This is why “I created an ECR endpoint” may not be enough. One operation can involve several services. Each needs a working path and the necessary permissions.

Use private DNS for the ECR endpoints, allow HTTPS to their interfaces, and associate the S3 endpoint with the client's route table. The caller also needs permission to pull the image.

This example covers the image pull; the application may need other services once it starts. Special cases, including an initial pull-through-cache fetch or externally hosted Windows layers, can need additional connectivity. See [AWS ECR endpoint requirements](https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html).

## 11. Add the remaining permission checks

We already used security groups. Once the path exists, additional controls can still block traffic or deny a service operation:

**IAM (Identity and Access Management)** controls who may perform AWS operations. For example, a network path to S3 lets the app send a request, but its identity still needs permission to read the requested object.

| Layer | Question it answers | What to remember |
|---|---|---|
| Security group | May this resource send or receive the traffic? | Stateful; allows replies to an allowed connection |
| Network ACL | May this traffic cross the subnet boundary? | Stateless; rules must allow both request and response traffic |
| IAM and resource policies | May this caller perform the AWS operation? | Network reachability does not grant service access |
| Endpoint policy, where supported | May this request pass through the endpoint? | Adds a restriction; does not replace service authorization |

Custom ACLs can block replies if they do not allow the applicable return ports. The default ACL initially allows inbound and outbound traffic. See [AWS network ACLs](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html).

For EC2, omitting a security group means AWS uses the VPC's default group. Its original rules allow inbound traffic from resources associated with that same group and allow outbound traffic. They do not allow arbitrary inbound internet traffic. Those rules can be edited, and launch tools may select a different group, so check the actual association. See [AWS default security groups](https://docs.aws.amazon.com/vpc/latest/userguide/default-security-group.html).

**A path and permission are separate requirements.** Allowing HTTPS does not create a route. Creating an endpoint does not grant access to every resource behind it.

## 12. Extend the design across Availability Zones

Our example explains connectivity. To keep serving requests when an AZ fails, repeat the needed parts of the application in another AZ within the same VPC.

A common production web layout uses at least two AZs, with a public subnet and a private application subnet in each:

```mermaid
flowchart TB
    subgraph vpc["One VPC, one Region"]
        subgraph az1["Availability Zone 1"]
            subgraph public1["Public subnet"]
                lb1["Load balancer<br/>Entry point in AZ 1"]
            end
            subgraph private1["Private subnet"]
                app1["App instance 1"]
            end
        end
        subgraph az2["Availability Zone 2"]
            subgraph public2["Public subnet"]
                lb2["Load balancer<br/>Entry point in AZ 2"]
            end
            subgraph private2["Private subnet"]
                app2["App instance 2"]
            end
        end
        lb1 --> app1
        lb1 --> app2
        lb2 --> app1
        lb2 --> app2
    end
```

The two entry points belong to one load balancer spanning both AZs. The arrows show how it can reach app instances in either AZ.

A **load balancer** sends requests to healthy app instances. If one AZ becomes unavailable, the other must have enough capacity to keep serving requests. AWS's [production VPC example](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-example-private-subnets-nat.html) uses this layout with an Auto Scaling group to maintain application instances.

The distinction is simple: **subnets provide places to run resources; redundant resources and failover provide availability.** Two subnets in the same AZ do not protect against an AZ outage. Putting the only app server in one AZ and the only database in another does not either: losing either one still breaks the application.

Include dependencies in the design: the database needs replication and failover, and each surviving app instance needs working network paths. With the zonal NAT gateways used in our example, a common resilient layout gives each AZ its own NAT gateway instead of making both depend on one AZ.

One subnet can be enough for a learning environment or a workload that accepts downtime. Choose the production layout based on availability needs; the goal is surviving failures, not reaching a particular subnet count.

## 13. Trace any connection with the same questions

Once the pieces are familiar, follow one request from start to finish:

1. **Where is the client?** Find its VPC, subnet, and private IP.
2. **What address is it calling?** Resolve the hostname, if it uses one.
3. **Which route matches?** Look at the subnet's route table and choose the most specific match.
4. **Where does that route lead?** Follow the local path, IGW, NAT, or endpoint, including any onward connection.
5. **Is the connection allowed?** Check security groups, ACLs, and the destination's listening port. Include the response path.
6. **Is the operation allowed?** For AWS services, check credentials, IAM, resource policies, and endpoint policies.

For example, an S3 request can use a gateway endpoint even when DNS returns a public IP. An ECR request can use an interface endpoint because private DNS returns a private IP. An external API request can use NAT because it matches the default route.

The network becomes easier to reason about when you follow a specific destination instead of trying to memorize the whole architecture at once.
