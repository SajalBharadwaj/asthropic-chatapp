# VCN (Virtual Cloud Network)
resource "oci_core_vcn" "asthropic_vcn" {
  compartment_id = var.compartment_id
  cidr_block     = "10.0.0.0/16"
  display_name   = "asthropic-vcn"
}

# Internet Gateway
resource "oci_core_internet_gateway" "asthropic_ig" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.asthropic_vcn.id
  display_name   = "asthropic-ig"
}

# Route Table
resource "oci_core_route_table" "asthropic_rt" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.asthropic_vcn.id
  display_name   = "asthropic-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.asthropic_ig.id
  }
}

# Subnet
resource "oci_core_subnet" "asthropic_subnet" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.asthropic_vcn.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "asthropic-subnet"
  route_table_id    = oci_core_route_table.asthropic_rt.id
  security_list_ids = [oci_core_vcn.asthropic_vcn.default_security_list_id]
}

# Compute Instance (Ubuntu Server jahan Docker chalega)
resource "oci_core_instance" "asthropic_server" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  shape               = "VM.Standard.E2.1.Micro" # Free tier eligible shape in OCI
  display_name        = "asthropic-backend-server"

  source_details {
    source_type = "image"
    # Ubuntu 22.04 Image OCID for your region
    source_id   = "ocid1.image.oc1.ap-mumbai-1.aaaaaaaaxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.asthropic_subnet.id
    assign_public_ip = true
  }

  metadata = {
    ssh_authorized_keys = "your-ssh-public-key"
  }
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}
